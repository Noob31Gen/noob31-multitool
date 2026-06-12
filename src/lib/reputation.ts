import { queryDNS } from "./doh";
import { queryRDAP } from "./rdap";
import { parseRDAP } from "./rdapParser";
import { getProxiedUrl, authenticatedFetch } from "./cors";
import type { AppSettings } from "./settings";
import { logger } from "./logger";

export interface ReputationBlocklistItem {
  name: string;
  listed: boolean;
  type?: string;
  details?: string;
  error?: boolean;
  refused?: boolean;
}

export interface OtxPulse {
  name: string;
  description: string;
  author: string;
  created: string;
  tags: string[];
}

export interface DomainReputationResult {
  domain: string;
  score: number;
  status: "Clean" | "Suspicious" | "Malicious" | "Fail";
  blocklists: ReputationBlocklistItem[];
  quad9Blocked: boolean;
  otxPulses: OtxPulse[];
  domainAgeDays: number | null;
  registrationDate: string | null;
  dnssecActive: boolean;
  queryTime: number;
  threatMinerMalwareCount: number;
}


function classifySurbl(ip: string): string {
  const lastOctet = parseInt(ip.split('.').pop() || "0", 10);
  const types: string[] = [];
  if (lastOctet & 2) types.push("SpamCop (sc)");
  if (lastOctet & 4) types.push("Bill's Shader (ws)");
  if (lastOctet & 8) types.push("Phishing (ph)");
  if (lastOctet & 16) types.push("Outbreak (ob)");
  if (lastOctet & 32) types.push("Abuse (ab)");
  if (lastOctet & 64) types.push("Junk Email Filter (jp)");
  if (lastOctet & 128) types.push("Malware (mw)");
  
  return types.length > 0 ? `Listed: ${types.join(', ')}` : "Listed (SURBL)";
}

export function getRegistrableDomain(domain: string): string {
  const parts = domain.trim().toLowerCase().split('.');
  if (parts.length <= 2) return domain;

  // List of common double TLD suffixes
  // List of common double TLD suffixes and dynamic hosting provider root domains
  const doubleTlds = new Set([
    "co.uk", "org.uk", "me.uk", "ltd.uk", "plc.uk", "sch.uk", "gov.uk", "nhs.uk",
    "com.au", "net.au", "org.au", "edu.au", "gov.au",
    "co.in", "net.in", "org.in", "firm.in", "gen.in", "ind.in", "nic.in", "ac.in", "edu.in", "res.in", "gov.in",
    "com.br", "net.br", "org.br", "gov.br", "edu.br", "inf.br", "eti.br", "srv.br",
    "co.jp", "org.jp", "ad.jp", "ne.jp", "gr.jp", "ac.jp", "ed.jp", "go.jp",
    "com.sg", "net.sg", "org.sg", "gov.sg", "edu.sg",
    "com.my", "net.my", "org.my", "gov.my", "edu.my",
    "co.nz", "net.nz", "org.nz", "govt.nz", "school.nz", "ac.nz", "geek.nz",
    "co.za", "net.za", "org.za", "web.za", "ac.za", "gov.za",
    "com.tw", "net.tw", "org.tw", "gov.tw", "edu.tw",
    "com.cn", "net.cn", "org.cn", "gov.cn", "edu.cn",
    "github.io", "pages.dev", "blogspot.com", "herokuapp.com", "weebly.com",
    "wixsite.com", "web.app", "firebaseapp.com", "vercel.app", "netlify.app"
  ]);

  const lastTwo = parts.slice(-2).join('.');
  if (doubleTlds.has(lastTwo)) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

export async function checkDomainReputation(
  domain: string,
  settings: AppSettings
): Promise<DomainReputationResult> {
  const startTime = Date.now();
  const cleanDomain = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');

  if (!cleanDomain || !cleanDomain.includes('.')) {
    throw new Error("Please enter a valid domain name.");
  }

  const registrableDomain = getRegistrableDomain(cleanDomain);

  // 1. DNSBL / Domain Blocklists
  const dbls = [
    { zone: "multi.surbl.org", name: "SURBL", classifier: classifySurbl }
  ];

  const dblPromises = dbls.map(async (dbl) => {
    const queryTarget = `${registrableDomain}.${dbl.zone}`;
    try {
      const res = await queryDNS(
        queryTarget,
        "A",
        settings.dohProvider,
        settings.customDnsUrl,
        settings.corsProvider,
        settings.customCorsUrl
      );
      if (res.status === 0 && res.records && res.records.length > 0) {
        const ip = res.records[0].data;
        // Ignore normal external IPs, DBL responses should be 127.0.x.x loopbacks
        if (ip.startsWith("127.")) {
          // Check for query refusal / rate limiting due to public DoH resolving
          if (dbl.zone === "multi.surbl.org" && ip === "127.0.0.1") {
            return {
              name: dbl.name,
              listed: false,
              refused: true,
              details: `Query Refused / Rate Limited by ${dbl.name} (public DoH resolver query block)`
            };
          }

          return {
            name: dbl.name,
            listed: true,
            type: dbl.classifier(ip),
            details: `Returned DNS resolution: ${ip}`
          };
        }
      }
      return { name: dbl.name, listed: false };
    } catch (err) {
      logger.warn(`Failed to query DBL ${dbl.name}:`, err);
      return { name: dbl.name, listed: false, error: true };
    }
  });

  // 2. Quad9 Blocking check
  const quad9Promise = (async () => {
    try {
      // Query Standard DNS first
      const stdRes = await queryDNS(
        cleanDomain,
        "A",
        settings.dohProvider,
        settings.customDnsUrl,
        settings.corsProvider,
        settings.customCorsUrl
      );
      
      const hasStdRecords = stdRes.records && stdRes.records.length > 0;
      if (!hasStdRecords) {
        return false; // Domain doesn't resolve standard anyway
      }

      // Query Quad9 DNS
      const q9Res = await queryDNS(
        cleanDomain,
        "A",
        "quad9",
        "",
        settings.corsProvider,
        settings.customCorsUrl
      );

      const hasQ9Records = q9Res.records && q9Res.records.length > 0;
      // If standard resolved but Quad9 returns empty or NXDOMAIN (status 3), it's blocked by Quad9
      return !hasQ9Records || q9Res.status === 3;
    } catch {
      return false; // Ignore errors
    }
  })();

  // 3. AlienVault OTX pulses
  const otxPromise = (async (): Promise<OtxPulse[]> => {
    try {
      const targetUrl = `https://otx.alienvault.com/api/v1/indicators/domain/${cleanDomain}/general`;
      const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await authenticatedFetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.pulse_info && Array.isArray(data.pulse_info.pulses)) {
        return data.pulse_info.pulses.slice(0, 5).map((p: {
          name?: string;
          description?: string;
          author_name?: string;
          created?: string;
          tags?: string[];
        }) => ({
          name: p.name || "Unknown Threat Pulse",
          description: p.description || "No description provided.",
          author: p.author_name || "OTX Contributor",
          created: p.created ? new Date(p.created).toLocaleDateString() : "N/A",
          tags: Array.isArray(p.tags) ? p.tags.slice(0, 5) : []
        }));
      }
      return [];
    } catch (err) {
      logger.warn("AlienVault OTX reputation check failed:", err);
      return [];
    }
  })();

  // 4. Domain Age via RDAP
  const rdapPromise = (async () => {
    try {
      const rdapData = await queryRDAP(cleanDomain, settings);
      const parsed = parseRDAP(rdapData);
      
      // Attempt to extract creation date
      let creationDateStr: string | undefined;
      
      // Fallback searches inside events or direct field if any
      if (parsed.creationDate) {
        creationDateStr = parsed.creationDate;
      }
      
      if (creationDateStr) {
        const createdDate = new Date(creationDateStr);
        if (!isNaN(createdDate.getTime())) {
          const ageDiff = Date.now() - createdDate.getTime();
          const ageDays = Math.floor(ageDiff / (1000 * 60 * 60 * 24));
          return {
            date: createdDate.toLocaleDateString(),
            days: ageDays
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  })();

  // 5. DNSSEC Check
  const dnssecPromise = (async () => {
    try {
      const res = await queryDNS(
        cleanDomain,
        "DNSKEY",
        settings.dohProvider,
        settings.customDnsUrl,
        settings.corsProvider,
        settings.customCorsUrl
      );
      return res.records && res.records.length > 0;
    } catch {
      return false;
    }
  })();

  // 6. ThreatMiner Passive Malware check
  const threatMinerPromise = (async (): Promise<number> => {
    try {
      const targetUrl = `https://api.threatminer.org/v2/domain.php?q=${cleanDomain}&rt=4`;
      const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await authenticatedFetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return 0;
      const data = await res.json();
      if (data && Array.isArray(data.results)) {
        return data.results.length;
      }
      return 0;
    } catch (err) {
      logger.warn("ThreatMiner reputation check failed:", err);
      return 0;
    }
  })();

  const [
    blocklists,
    quad9Blocked,
    otxPulses,
    rdapInfo,
    dnssecActive,
    threatMinerMalwareCount
  ] = await Promise.all([
    Promise.all(dblPromises),
    quad9Promise,
    otxPromise,
    rdapPromise,
    dnssecPromise,
    threatMinerPromise
  ]);

  // Score computation
  let score = 100;
  
  // Penalties
  const listedBlocklists = blocklists.filter(b => b.listed);
  if (listedBlocklists.length > 0) {
    // 30 points penalty per blacklist
    score -= listedBlocklists.length * 30;
  }

  if (quad9Blocked) {
    score -= 40; // Heavy penalty if blocked by security DNS
  }

  if (otxPulses.length > 0) {
    // 10 points penalty if domain associated with pulses, max 20 points
    score -= Math.min(20, otxPulses.length * 10);
  }

  if (rdapInfo && rdapInfo.days !== null) {
    if (rdapInfo.days < 30) {
      score -= 25; // Newly registered domain penalty
    } else if (rdapInfo.days < 90) {
      score -= 10; // Young domain warning
    }
  }

  if (threatMinerMalwareCount > 0) {
    score -= 30; // Deduct 30 points if malware associated
  }

  // DNSSEC Bonus points
  if (dnssecActive) {
    score += 5;
  }

  // Keep within bounds
  score = Math.max(0, Math.min(100, score));

  // If any lookup fails, fail-close meaning 0 score and status Fail
  let status: DomainReputationResult["status"] = "Clean";
  if (blocklists.some(b => b.error)) {
    score = 0;
    status = "Fail";
  } else {
    // Determine status
    if (score < 60) {
      status = "Malicious";
    } else if (score < 85) {
      status = "Suspicious";
    }
  }

  return {
    domain: cleanDomain,
    score,
    status,
    blocklists,
    quad9Blocked,
    otxPulses,
    domainAgeDays: rdapInfo ? rdapInfo.days : null,
    registrationDate: rdapInfo ? rdapInfo.date : null,
    dnssecActive,
    queryTime: Date.now() - startTime,
    threatMinerMalwareCount
  };
}
