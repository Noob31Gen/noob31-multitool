import { getProxiedUrl, authenticatedFetch } from "./cors";
import type { AppSettings } from "./settings";
import { logger } from "./logger";
import { queryInternetDb, type InternetDbHost } from "./internetdb";

export type ThreatInputType = "ip" | "domain" | "url" | "hash" | "keyword";

export interface ThreatPulse {
  id: string;
  name: string;
  description: string;
  author: string;
  created: string;
  tags: string[];
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
  server?: string;
  mimeType?: string;
  requests?: number;
  uniqIPs?: number;
  uniqCountries?: number;
  asnname?: string;
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
  otxUnauthKeywordSearch?: boolean;
  otxValidation?: { source: string; message: string; name: string }[];
  otxRelated?: {
    adversaries: string[];
    malwareFamilies: string[];
    industries: string[];
  };
  phishStatsMatches: PhishStatsRecord[];
  urlScanHistory: UrlScanRecord[];
  malwareBazaar?: MalwareBazaarRecord;
  internetDb?: InternetDbHost | null;
  queryTime: number;
  /** Map of source name → error message when a source failed to fetch */
  sourceErrors: Record<string, string>;
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
): Promise<{
  pulses: ThreatPulse[];
  metadata?: { reputation?: number };
  keywordUnauth?: boolean;
  error?: string;
  validation?: { source: string; message: string; name: string }[];
  related?: {
    adversaries: string[];
    malwareFamilies: string[];
    industries: string[];
  };
}> {
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
    const res = await authenticatedFetch(proxyUrl, { signal: controller.signal });
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

    const validation = Array.isArray(data.validation) ? data.validation : [];
    const related = {
      adversaries: [] as string[],
      malwareFamilies: [] as string[],
      industries: [] as string[]
    };

    if (data.pulse_info && data.pulse_info.related) {
      const rel = data.pulse_info.related.alienvault || data.pulse_info.related.other || {};
      if (Array.isArray(rel.adversary)) related.adversaries = rel.adversary;
      if (Array.isArray(rel.malware_families)) related.malwareFamilies = rel.malware_families;
      if (Array.isArray(rel.industries)) related.industries = rel.industries;
    }

    return {
      pulses,
      metadata: data && typeof data.reputation === "number" ? { reputation: data.reputation } : undefined,
      validation,
      related
    };
  } catch (err) {
    logger.warn("Threat Intel: OTX fetch failed", err);
    return { pulses: [], error: err instanceof Error ? err.message : "Unknown error" };
  }
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
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const res = await authenticatedFetch(proxyUrl, { signal: controller.signal });
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
    const msg = err instanceof Error ? err.message : "Unknown error";
    // Return a marker object so the orchestrator knows it failed vs. returned empty
    const errorResult: PhishStatsRecord[] = [];
    (errorResult as unknown as { __error: string }).__error = msg;
    return errorResult;
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
    const res = await authenticatedFetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data && Array.isArray(data.results)) {
      return data.results.map((item: {
        _id?: string;
        task?: { url?: string; time?: string };
        page?: { domain?: string; ip?: string; title?: string; server?: string; mimeType?: string; asnname?: string };
        stats?: { requests?: number; uniqIPs?: number; uniqCountries?: number };
      }) => ({
        id: item._id || "",
        url: item.task?.url || "",
        domain: item.page?.domain || "",
        ip: item.page?.ip || "",
        time: item.task?.time ? new Date(item.task.time).toLocaleString() : "N/A",
        title: item.page?.title || "N/A",
        screenshot: item._id ? `https://urlscan.io/screenshots/${item._id}.png` : undefined,
        server: item.page?.server || undefined,
        mimeType: item.page?.mimeType || undefined,
        requests: item.stats?.requests || undefined,
        uniqIPs: item.stats?.uniqIPs || undefined,
        uniqCountries: item.stats?.uniqCountries || undefined,
        asnname: item.page?.asnname || undefined,
      }));
    }
    return [];
  } catch (err) {
    logger.warn("Threat Intel: URLScan.io fetch failed", err);
    const errorResult: UrlScanRecord[] = [];
    (errorResult as unknown as { __error: string }).__error = err instanceof Error ? err.message : "Unknown error";
    return errorResult;
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
    const res = await authenticatedFetch(proxyUrl, {
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
  const psPromise = fetchPhishStats(clean, detectedType, settings);
  const usPromise = fetchUrlScan(clean, detectedType, settings);
  const mbPromise =
    detectedType === "hash" ? fetchMalwareBazaar(clean, settings) : Promise.resolve(undefined);

  const internetDbPromise =
    detectedType === "ip" ? queryInternetDb(clean, settings).catch(err => {
      logger.warn("Threat Intel: InternetDB fetch failed", err);
      const errorResult = { __error: err instanceof Error ? err.message : "Unknown error" };
      return errorResult as { __error: string };
    }) : Promise.resolve(undefined);

  const [otxRes, psRes, usRes, mbRes, idbRes] = await Promise.all([
    otxPromise,
    psPromise,
    usPromise,
    mbPromise,
    internetDbPromise,
  ]);

  // Collect source errors
  const sourceErrors: Record<string, string> = {};
  if (otxRes.error) sourceErrors["AlienVault OTX"] = otxRes.error;
  if ((psRes as unknown as { __error?: string }).__error) {
    sourceErrors["PhishStats"] = (psRes as unknown as { __error: string }).__error;
  }
  if ((usRes as unknown as { __error?: string }).__error) {
    sourceErrors["URLScan.io"] = (usRes as unknown as { __error: string }).__error;
  }
  if (idbRes && (idbRes as { __error?: string }).__error) {
    sourceErrors["InternetDB"] = (idbRes as { __error: string }).__error;
  }

  return {
    query: clean,
    detectedType,
    otxPulses: otxRes.pulses,
    otxMetadata: otxRes.metadata,
    otxUnauthKeywordSearch: otxRes.keywordUnauth,
    otxValidation: otxRes.validation,
    otxRelated: otxRes.related,
    phishStatsMatches: psRes,
    urlScanHistory: usRes,
    malwareBazaar: mbRes,
    internetDb: (idbRes && !(idbRes as { __error?: string }).__error) ? (idbRes as InternetDbHost) : undefined,
    queryTime: Date.now() - startTime,
    sourceErrors,
  };
}
