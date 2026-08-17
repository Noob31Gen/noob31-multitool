import type { ThreatIntelResponse, ThreatPulse, UrlScanResultItem } from '../types';

export function isIp(str: string): boolean {
  const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  return ipv4Regex.test(str) || ipv6Regex.test(str);
}

export function detectInputType(query: string): 'ip' | 'domain' | 'url' | 'hash' | 'keyword' {
  const clean = query.trim();
  if (!clean) return 'keyword';

  if (isIp(clean)) return 'ip';

  if (/^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/.test(clean)) {
    return 'hash';
  }

  if (/^https?:\/\//i.test(clean)) return 'url';
  if (clean.includes('/') && !clean.startsWith('/') && clean.indexOf('/') < clean.lastIndexOf('.')) {
    return 'url';
  }

  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?$/;
  if (domainRegex.test(clean)) {
    return 'domain';
  }

  return 'keyword';
}

async function fetchOtx(query: string, type: 'ip' | 'domain' | 'url' | 'hash' | 'keyword') {
  if (type === 'keyword') return { pulses: [] };

  let otxType = 'domain';
  if (type === 'ip') otxType = query.includes(':') ? 'IPv6' : 'IPv4';
  else if (type === 'hash') otxType = 'file';
  else if (type === 'url') otxType = 'url';

  const cleanQuery = type === 'domain' ? query.replace(/^(https?:\/\/)?(www\.)?/, '') : query;
  const targetUrl = `https://otx.alienvault.com/api/v1/indicators/${otxType}/${encodeURIComponent(cleanQuery)}/general`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as {
      reputation?: number;
      pulse_info?: {
        pulses?: {
          id?: string;
          name?: string;
          description?: string;
          author_name?: string;
          created?: string;
          tags?: string[];
        }[];
      };
    };

    const pulses: ThreatPulse[] = (data?.pulse_info?.pulses || []).map((p) => ({
      id: p.id || '',
      name: p.name || 'Unknown Threat Pulse',
      description: p.description || 'No description provided.',
      author: p.author_name || 'OTX Contributor',
      created: p.created ? new Date(p.created).toLocaleDateString() : 'N/A',
      tags: Array.isArray(p.tags) ? p.tags.slice(0, 8) : []
    }));

    return {
      pulses,
      metadata: typeof data.reputation === 'number' ? { reputation: data.reputation } : undefined
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function fetchUrlScan(query: string, type: 'ip' | 'domain' | 'url' | 'hash' | 'keyword'): Promise<UrlScanResultItem[]> {
  let scanQuery = `"${query}"`;
  if (type === 'ip') scanQuery = `ip:"${query}"`;
  else if (type === 'domain') scanQuery = `domain:"${query.replace(/^(https?:\/\/)?(www\.)?/, '')}"`;
  else if (type === 'url') scanQuery = `url:"${query}"`;
  else if (type === 'hash') scanQuery = `hash:"${query}"`;

  const targetUrl = `https://urlscan.io/api/v1/search/?q=${encodeURIComponent(scanQuery)}&size=10`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as {
      results?: {
        _id?: string;
        task?: { url?: string; time?: string };
        page?: { domain?: string; ip?: string; title?: string; server?: string; mimeType?: string; asnname?: string };
      }[];
    };

    return (data.results || []).map((r) => ({
      id: r._id || '',
      url: r.task?.url || '',
      domain: r.page?.domain || '',
      ip: r.page?.ip || '',
      time: r.task?.time ? new Date(r.task.time).toLocaleString() : 'N/A',
      title: r.page?.title || 'N/A',
      screenshot: r._id ? `https://urlscan.io/screenshots/${r._id}.png` : undefined,
      server: r.page?.server,
      mimeType: r.page?.mimeType,
      asnname: r.page?.asnname
    }));
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function fetchInternetDb(ip: string) {
  const targetUrl = `https://internetdb.shodan.io/${encodeURIComponent(ip)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as {
      ip: string;
      ports?: number[];
      cves?: string[];
      tags?: string[];
      hostnames?: string[];
      vulns?: string[];
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function fetchBlocklistDe(ip: string) {
  const targetUrl = `https://api.blocklist.de/api.php?ip=${encodeURIComponent(ip)}&format=json`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as {
      attacks?: number;
      reports?: number;
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function aggregateThreatIntel(query: string): Promise<ThreatIntelResponse> {
  const startTime = performance.now();
  const clean = query.trim();
  const detectedType = detectInputType(clean);

  const sourceErrors: Record<string, string> = {};

  const [otxRes, urlScanRes, internetDbRes, blocklistDeRes] = await Promise.allSettled([
    fetchOtx(clean, detectedType),
    fetchUrlScan(clean, detectedType),
    detectedType === 'ip' ? fetchInternetDb(clean) : Promise.resolve(null),
    detectedType === 'ip' ? fetchBlocklistDe(clean) : Promise.resolve(null)
  ]);

  let otxPulses: ThreatPulse[] = [];
  let otxMetadata: { reputation?: number } | undefined;
  if (otxRes.status === 'fulfilled') {
    otxPulses = otxRes.value.pulses;
    otxMetadata = otxRes.value.metadata;
  } else {
    sourceErrors['AlienVault OTX'] = otxRes.reason?.message || 'Failed to fetch OTX';
  }

  let urlScanHistory: UrlScanResultItem[] = [];
  if (urlScanRes.status === 'fulfilled') {
    urlScanHistory = urlScanRes.value;
  } else {
    sourceErrors['URLScan.io'] = urlScanRes.reason?.message || 'Failed to fetch URLScan.io';
  }

  let internetDb = null;
  if (internetDbRes.status === 'fulfilled') {
    internetDb = internetDbRes.value;
  } else if (detectedType === 'ip') {
    sourceErrors['Shodan InternetDB'] = internetDbRes.reason?.message || 'Failed to fetch InternetDB';
  }

  let blocklistDe = null;
  if (blocklistDeRes.status === 'fulfilled') {
    blocklistDe = blocklistDeRes.value;
  }

  return {
    query: clean,
    detectedType,
    otxPulses,
    otxMetadata,
    urlScanHistory,
    internetDb,
    blocklistDe,
    sourceErrors: Object.keys(sourceErrors).length > 0 ? sourceErrors : undefined,
    queryTimeMs: Math.round(performance.now() - startTime)
  };
}
