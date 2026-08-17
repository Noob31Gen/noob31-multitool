import { lookupDns, formatIpToPtr } from './dnsService';

export interface BlacklistCheckResult {
  host: string;
  isBlacklisted: boolean;
  listedCount: number;
  totalLists: number;
  results: {
    zone: string;
    listed: boolean;
    response?: string;
  }[];
  queryTimeMs: number;
}

const COMMON_DNSBL_ZONES = [
  'zen.spamhaus.org',
  'b.barracudacentral.org',
  'bl.spamcop.net',
  'dnsbl.sorbs.net',
  'drone.abuse.ch',
  'rbl.blockedservers.com',
  'bl.blocklist.de'
];

export async function checkBlacklist(ip: string): Promise<BlacklistCheckResult> {
  const startTime = performance.now();
  const cleanIp = ip.trim();

  // Reverse IPv4 octets for DNSBL lookup
  const octets = cleanIp.split('.');
  if (octets.length !== 4) {
    throw new Error('DNSBL checks currently require an IPv4 address');
  }
  const reversedIp = octets.reverse().join('.');

  const results = await Promise.all(
    COMMON_DNSBL_ZONES.map(async (zone) => {
      const queryHost = `${reversedIp}.${zone}`;
      try {
        const res = await lookupDns(queryHost, 'A', 'cloudflare');
        const listed = res.status === 0 && res.records.length > 0;
        return {
          zone,
          listed,
          response: listed ? res.records[0]?.data : undefined
        };
      } catch {
        return {
          zone,
          listed: false
        };
      }
    })
  );

  const listedCount = results.filter(r => r.listed).length;

  return {
    host: cleanIp,
    isBlacklisted: listedCount > 0,
    listedCount,
    totalLists: results.length,
    results,
    queryTimeMs: Math.round(performance.now() - startTime)
  };
}

export async function checkDomainReputation(target: string): Promise<{
  target: string;
  score: number; // 0 to 100
  riskLevel: 'clean' | 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  queryTimeMs: number;
}> {
  const startTime = performance.now();
  const clean = target.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');

  let score = 100;
  const flags: string[] = [];

  // Check DNS presence
  let dnsOk = false;
  try {
    const aRec = await lookupDns(clean, 'A', 'auto');
    dnsOk = aRec.records.length > 0;
  } catch {
    dnsOk = false;
  }

  if (!dnsOk) {
    score -= 30;
    flags.push('Domain has no active A records in public DNS');
  }

  // Check Blocklist.de if IP
  const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(clean);
  if (isIpv4) {
    try {
      const res = await fetch(`https://api.blocklist.de/api.php?ip=${clean}&format=json`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const data = await res.json() as { attacks?: number; reports?: number };
        if ((data.attacks && data.attacks > 0) || (data.reports && data.reports > 0)) {
          score -= 50;
          flags.push(`Reported on Blocklist.de (${data.attacks || 0} attacks, ${data.reports || 0} reports)`);
        }
      }
    } catch {
      // ignore
    }
  }

  let riskLevel: 'clean' | 'low' | 'medium' | 'high' | 'critical' = 'clean';
  if (score < 40) riskLevel = 'critical';
  else if (score < 60) riskLevel = 'high';
  else if (score < 80) riskLevel = 'medium';
  else if (score < 95) riskLevel = 'low';

  return {
    target: clean,
    score: Math.max(0, score),
    riskLevel,
    details: {
      flags,
      hasValidDns: dnsOk
    },
    queryTimeMs: Math.round(performance.now() - startTime)
  };
}
