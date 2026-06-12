import { getProxiedUrl } from "./cors";
import type { AppSettings } from "./settings";
import { logger } from "./logger";

export type ThreatInputType = "ip" | "domain" | "url" | "hash" | "keyword";

export interface ThreatPulse {
  id: string;
  name: string;
  description: string;
  author: string;
  created: string;
  tags: string[];
}

export interface ThreatMinerPassiveDns {
  ip: string;
  domain: string;
  firstSeen: string;
  lastSeen: string;
  source: string;
}

export interface ThreatMinerSample {
  hash: string;
  fileType?: string;
  fileSize?: number;
  added?: string;
}

export interface PhishStatsRecord {
  id: number;
  url: string;
  ip: string;
  country: string;
  asn: string;
  title: string;
  date: string;
  score: number;
}

export interface UrlScanRecord {
  id: string;
  url: string;
  domain: string;
  ip: string;
  time: string;
  title: string;
  screenshot?: string;
}

export interface MalwareBazaarRecord {
  sha256: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  family: string;
  firstSeen: string;
  tags: string[];
  tagsCount: number;
  clamAv?: string;
  trendMicro?: string;
  virustotalPercentage?: string;
}

export interface AggregatedThreatIntel {
  query: string;
  detectedType: ThreatInputType;
  otxPulses: ThreatPulse[];
  otxMetadata?: {
    reputation?: number;
    sections?: string[];
  };
  threatMinerPassiveDns: ThreatMinerPassiveDns[];
  threatMinerSamples: ThreatMinerSample[];
  threatMinerDetails?: {
    fileSize?: string;
    fileType?: string;
    ssdeep?: string;
    sha256?: string;
  };
  phishStatsMatches: PhishStatsRecord[];
  urlScanHistory: UrlScanRecord[];
  malwareBazaar?: MalwareBazaarRecord;
  queryTime: number;
}

// Helpers for input detection
export function isIp(str: string): boolean {
  const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  return ipv4Regex.test(str) || ipv6Regex.test(str);
}

export function detectInputType(query: string): ThreatInputType {
  const clean = query.trim();
  if (!clean) return "keyword";

  // Check IP
  if (isIp(clean)) return "ip";

  // Check Hashes (MD5 = 32 hex, SHA-1 = 40 hex, SHA-256 = 64 hex)
  if (/^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/.test(clean)) {
    return "hash";
  }

  // Check URL (starts with http/https or contains path slashes/query parameters after valid domain chars)
  if (/^https?:\/\//i.test(clean)) return "url";

  if (
    clean.includes("/") &&
    !clean.startsWith("/") &&
    clean.indexOf("/") < clean.lastIndexOf(".")
  ) {
    return "url";
  }

  // Check Domain (letters, numbers, hyphens, separated by dots, ending with a TLD of at least 2 chars)
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?$/;
  if (domainRegex.test(clean)) {
    return "domain";
  }

  return "keyword";
}

// Fetchers
async function fetchOtxPulses(
  query: string,
  type: ThreatInputType,
  settings: AppSettings
): Promise<{ pulses: ThreatPulse[]; metadata?: { reputation?: number } }> {
  try {
    let otxType = "domain";
    if (type === "ip") {
      otxType = query.includes(":") ? "IPv6" : "IPv4";
    } else if (type === "hash") {
      otxType = "file";
    } else if (type === "url") {
      otxType = "url";
    } else if (type === "keyword") {
      // General OTX keyword search is not allowed keylessly (returns 401/403).
      // Return empty array to fallback to browser search
      return { pulses: [] };
    }

    // Clean query slightly if url
    let cleanQuery = query.trim();
    if (otxType === "url") {
      // OTX url endpoint expects the full URL
      cleanQuery = query.trim();
    } else if (otxType === "domain") {
      cleanQuery = query.trim().replace(/^(https?:\/\/)?(www\.)?/, "");
    }

    const targetUrl = `https://otx.alienvault.com/api/v1/indicators/${otxType}/${encodeURIComponent(
      cleanQuery
    )}/general`;
    const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    let pulses: ThreatPulse[] = [];
    if (data && data.pulse_info && Array.isArray(data.pulse_info.pulses)) {
      pulses = data.pulse_info.pulses.map((p: {
        id?: string;
        name?: string;
        description?: string;
        author_name?: string;
        created?: string;
        tags?: string[];
      }) => ({
        id: p.id || "",
        name: p.name || "Unknown threat pulse",
        description: p.description || "No description provided.",
        author: p.author_name || "OTX Contributor",
        created: p.created ? new Date(p.created).toLocaleDateString() : "N/A",
        tags: Array.isArray(p.tags) ? p.tags.slice(0, 8) : [],
      }));
    }

    return {
      pulses,
      metadata: data && typeof data.reputation === "number" ? { reputation: data.reputation } : undefined,
    };
  } catch (err) {
    logger.warn("Threat Intel: OTX fetch failed", err);
    return { pulses: [] };
  }
}

async function fetchThreatMiner(
  query: string,
  type: ThreatInputType,
  settings: AppSettings
): Promise<{
  dns: ThreatMinerPassiveDns[];
  samples: ThreatMinerSample[];
  details?: { fileSize?: string; fileType?: string; ssdeep?: string; sha256?: string };
}> {
  const result: {
    dns: ThreatMinerPassiveDns[];
    samples: ThreatMinerSample[];
    details?: { fileSize?: string; fileType?: string; ssdeep?: string; sha256?: string };
  } = { dns: [], samples: [] };
  if (type === "url" || type === "keyword") return result;

  try {
    const cleanQuery = query.trim().replace(/^(https?:\/\/)?(www\.)?/, "");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    if (type === "domain" || type === "ip") {
      const isHost = type === "ip";
      const apiFile = isHost ? "host.php" : "domain.php";

      // 1. Passive DNS (rt=2)
      const dnsUrl = `https://api.threatminer.org/v2/${apiFile}?q=${encodeURIComponent(
        cleanQuery
      )}&rt=2`;
      const dnsProxy = getProxiedUrl(dnsUrl, settings.corsProvider, settings.customCorsUrl);

      try {
        const dnsRes = await fetch(dnsProxy, { signal: controller.signal });
        if (dnsRes.ok) {
          const dnsData = await dnsRes.json();
          if (dnsData && dnsData.status_code === "200" && Array.isArray(dnsData.results)) {
            result.dns = dnsData.results.slice(0, 15).map((r: {
              ip?: string;
              domain?: string;
              first_seen?: string;
              last_seen?: string;
              source?: string;
            }) => ({
              ip: r.ip || "",
              domain: r.domain || "",
              firstSeen: r.first_seen || "N/A",
              lastSeen: r.last_seen || "N/A",
              source: r.source || "ThreatMiner",
            }));
          }
        }
      } catch (err) {
        logger.warn("Threat Intel: ThreatMiner dns failed", err);
      }

      // 2. Malware Samples (rt=4)
      const samplesUrl = `https://api.threatminer.org/v2/${apiFile}?q=${encodeURIComponent(
        cleanQuery
      )}&rt=4`;
      const samplesProxy = getProxiedUrl(samplesUrl, settings.corsProvider, settings.customCorsUrl);

      try {
        const samplesRes = await fetch(samplesProxy, { signal: controller.signal });
        if (samplesRes.ok) {
          const samplesData = await samplesRes.json();
          if (samplesData && samplesData.status_code === "200" && Array.isArray(samplesData.results)) {
            result.samples = samplesData.results.slice(0, 15).map((hash: string) => ({
              hash,
            }));
          }
        }
      } catch (err) {
        logger.warn("Threat Intel: ThreatMiner samples failed", err);
      }
    } else if (type === "hash") {
      // Sample metadata lookup (rt=1)
      const sampleUrl = `https://api.threatminer.org/v2/sample.php?q=${encodeURIComponent(
        cleanQuery
      )}&rt=1`;
      const sampleProxy = getProxiedUrl(sampleUrl, settings.corsProvider, settings.customCorsUrl);

      const sampleRes = await fetch(sampleProxy, { signal: controller.signal });
      if (sampleRes.ok) {
        const sampleData = await sampleRes.json();
        if (sampleData && sampleData.status_code === "200" && Array.isArray(sampleData.results) && sampleData.results.length > 0) {
          const mainResult = sampleData.results[0];
          result.details = {
            fileSize: mainResult.file_size ? `${(mainResult.file_size / 1024).toFixed(2)} KB` : undefined,
            fileType: mainResult.file_type || undefined,
            ssdeep: mainResult.ssdeep || undefined,
            sha256: mainResult.sha256 || undefined,
          };
        }
      }
    }

    clearTimeout(timeoutId);
  } catch (err) {
    logger.warn("Threat Intel: ThreatMiner main query failed", err);
  }

  return result;
}

async function fetchPhishStats(
  query: string,
  type: ThreatInputType,
  settings: AppSettings
): Promise<PhishStatsRecord[]> {
  try {
    let whereClause = "";
    const clean = query.trim();

    if (type === "ip") {
      whereClause = `(ip,eq,${clean})`;
    } else if (type === "domain") {
      const cleanDom = clean.replace(/^(https?:\/\/)?(www\.)?/, "");
      whereClause = `(url,like,~${cleanDom}~)`;
    } else if (type === "url") {
      whereClause = `(url,eq,${clean})`;
    } else if (type === "keyword") {
      whereClause = `(title,like,~${clean}~)~or(url,like,~${clean}~)`;
    } else {
      return []; // Hash not supported in PhishStats
    }

    const targetUrl = `https://api.phishstats.info/api/phishing?_where=${encodeURIComponent(
      whereClause
    )}&_sort=-id&_size=20`;
    const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (Array.isArray(data)) {
      return data.map((item: {
        id?: number;
        url?: string;
        ip?: string;
        countrycode?: string;
        asn?: string;
        title?: string;
        date?: string;
        score?: number;
      }) => ({
        id: item.id || 0,
        url: item.url || "",
        ip: item.ip || "",
        country: item.countrycode || "Unknown",
        asn: item.asn || "N/A",
        title: item.title || "Phishing Page",
        date: item.date ? new Date(item.date).toLocaleDateString() : "N/A",
        score: typeof item.score === "number" ? item.score : 0,
      }));
    }
    return [];
  } catch (err) {
    logger.warn("Threat Intel: PhishStats fetch failed", err);
    return [];
  }
}

async function fetchUrlScan(
  query: string,
  type: ThreatInputType,
  settings: AppSettings
): Promise<UrlScanRecord[]> {
  try {
    let scanQuery = "";
    const clean = query.trim();

    if (type === "ip") {
      scanQuery = `ip:"${clean}"`;
    } else if (type === "domain") {
      const cleanDom = clean.replace(/^(https?:\/\/)?(www\.)?/, "");
      scanQuery = `domain:"${cleanDom}"`;
    } else if (type === "url") {
      scanQuery = `url:"${clean}"`;
    } else if (type === "hash") {
      scanQuery = `hash:"${clean}"`;
    } else {
      scanQuery = `"${clean}"`;
    }

    const targetUrl = `https://urlscan.io/api/v1/search/?q=${encodeURIComponent(
      scanQuery
    )}&size=10`;
    const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data && Array.isArray(data.results)) {
      return data.results.map((item: {
        _id?: string;
        task?: { url?: string; time?: string };
        page?: { domain?: string; ip?: string; title?: string };
      }) => ({
        id: item._id || "",
        url: item.task?.url || "",
        domain: item.page?.domain || "",
        ip: item.page?.ip || "",
        time: item.task?.time ? new Date(item.task.time).toLocaleString() : "N/A",
        title: item.page?.title || "N/A",
        screenshot: item._id ? `https://urlscan.io/screenshots/${item._id}.png` : undefined,
      }));
    }
    return [];
  } catch (err) {
    logger.warn("Threat Intel: URLScan.io fetch failed", err);
    return [];
  }
}

async function fetchMalwareBazaar(
  hash: string,
  settings: AppSettings
): Promise<MalwareBazaarRecord | undefined> {
  // Try sending POST request through proxies that support body forwarding.
  // Standard transparent proxies like corsproxy.io support it.
  try {
    const targetUrl = "https://mb-api.abuse.ch/api/v1/";
    const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);

    const bodyParams = new URLSearchParams();
    bodyParams.append("query", "get_info");
    bodyParams.append("hash", hash.trim());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data && data.query_status === "ok" && Array.isArray(data.data) && data.data.length > 0) {
      const item = data.data[0];
      const vendorIntel = item.vendor_intel || {};
      const vt = vendorIntel.VirusTotal || {};

      return {
        sha256: item.sha256_hash || hash,
        fileName: item.file_name || "Unknown",
        fileSize: item.file_size || 0,
        fileType: item.file_type || "Unknown",
        family: item.signature || "Unidentified Family",
        firstSeen: item.first_seen ? new Date(item.first_seen).toLocaleDateString() : "N/A",
        tags: Array.isArray(item.tags) ? item.tags : [],
        tagsCount: Array.isArray(item.tags) ? item.tags.length : 0,
        clamAv: vendorIntel.ClamAV || undefined,
        trendMicro: vendorIntel.TrendMicro || undefined,
        virustotalPercentage: typeof vt.detection_rate === "string" ? vt.detection_rate : undefined,
      };
    }
    return undefined;
  } catch (err) {
    logger.warn("Threat Intel: MalwareBazaar fetch failed", err);
    return undefined;
  }
}

// Master search orchestrator
export async function searchThreatIntel(
  query: string,
  settings: AppSettings
): Promise<AggregatedThreatIntel> {
  const startTime = Date.now();
  const detectedType = detectInputType(query);

  const clean = query.trim();

  // Run fetches in parallel
  const otxPromise = fetchOtxPulses(clean, detectedType, settings);
  const tmPromise = fetchThreatMiner(clean, detectedType, settings);
  const psPromise = fetchPhishStats(clean, detectedType, settings);
  const usPromise = fetchUrlScan(clean, detectedType, settings);
  const mbPromise =
    detectedType === "hash" ? fetchMalwareBazaar(clean, settings) : Promise.resolve(undefined);

  const [otxRes, tmRes, psRes, usRes, mbRes] = await Promise.all([
    otxPromise,
    tmPromise,
    psPromise,
    usPromise,
    mbPromise,
  ]);

  return {
    query: clean,
    detectedType,
    otxPulses: otxRes.pulses,
    otxMetadata: otxRes.metadata,
    threatMinerPassiveDns: tmRes.dns,
    threatMinerSamples: tmRes.samples,
    threatMinerDetails: tmRes.details,
    phishStatsMatches: psRes,
    urlScanHistory: usRes,
    malwareBazaar: mbRes,
    queryTime: Date.now() - startTime,
  };
}
