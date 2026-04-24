import type { AppSettings } from "./settings"
import { getProxiedUrl } from "@/lib/cors"

export interface SubdomainResult {
  subdomain: string;
  sources: string[];
}

export async function querySubdomains(domain: string, settings: AppSettings): Promise<SubdomainResult[]> {
  domain = domain.trim().toLowerCase();
  
  const sources = [
    fetchHackerTarget(domain, settings),
    fetchAlienVault(domain, settings),
    fetchThreatMiner(domain, settings),
    fetchUrlScan(domain, settings)
  ];

  // We use Promise.allSettled so that if one source fails, the others still succeed.
  const results = await Promise.allSettled(sources);
  
  const subdomainMap = new Map<string, Set<string>>();
  let allFailed = true;
  const errors: string[] = [];

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allFailed = false;
      result.value.forEach(({ subdomain, source }) => {
        if (!subdomainMap.has(subdomain)) {
          subdomainMap.set(subdomain, new Set());
        }
        subdomainMap.get(subdomain)!.add(source);
      });
    } else {
      errors.push(result.reason?.message || 'Unknown error');
    }
  });

  if (allFailed) {
    throw new Error(`All subdomain sources failed. Details: ${errors.join(" | ")}`);
  }

  // Convert the map to the final array format and sort alphabetically
  const finalResults: SubdomainResult[] = Array.from(subdomainMap.entries()).map(([subdomain, sourcesSet]) => ({
    subdomain,
    sources: Array.from(sourcesSet).sort()
  }));

  finalResults.sort((a, b) => a.subdomain.localeCompare(b.subdomain));

  return finalResults;
}

async function fetchHackerTarget(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://api.hackertarget.com/hostsearch/?q=${domain}`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    
    // HackerTarget can return errors in plain text like "error check your search parameter" or "API count exceeded"
    if (text.includes("error") || text.includes("API count exceeded")) {
      throw new Error(`HackerTarget API Error: ${text.trim()}`);
    }

    const lines = text.split('\n');
    const results: { subdomain: string, source: string }[] = [];

    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length > 0 && parts[0].trim()) {
        const sub = parts[0].trim().toLowerCase();
        if (sub.endsWith(domain)) {
          results.push({ subdomain: sub, source: 'HackerTarget' });
        }
      }
    }

    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`HackerTarget: ${error.message}`);
  }
}

async function fetchAlienVault(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://otx.alienvault.com/api/v1/indicators/domain/${domain}/passive_dns`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const results: { subdomain: string, source: string }[] = [];

    if (data && Array.isArray(data.passive_dns)) {
      for (const record of data.passive_dns) {
        if (record.hostname) {
          const sub = record.hostname.trim().toLowerCase();
          if (sub.endsWith(domain)) {
            results.push({ subdomain: sub, source: 'AlienVault OTX' });
          }
        }
      }
    }

    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`AlienVault: ${error.message}`);
  }
}

async function fetchThreatMiner(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://api.threatminer.org/v2/domain.php?q=${domain}&rt=5`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const results: { subdomain: string, source: string }[] = [];

    if (data && Array.isArray(data.results)) {
      for (const record of data.results) {
        if (typeof record === 'string') {
          const sub = record.trim().toLowerCase();
          if (sub.endsWith(domain)) {
            results.push({ subdomain: sub, source: 'ThreatMiner' });
          }
        }
      }
    }

    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`ThreatMiner: ${error.message}`);
  }
}

async function fetchUrlScan(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://urlscan.io/api/v1/search/?q=domain:${domain}`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const results: { subdomain: string, source: string }[] = [];

    if (data && Array.isArray(data.results)) {
      for (const record of data.results) {
        if (record.page && record.page.domain) {
          const sub = record.page.domain.trim().toLowerCase();
          if (sub.endsWith(domain)) {
            results.push({ subdomain: sub, source: 'URLScan.io' });
          }
        }
      }
    }

    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`URLScan.io: ${error.message}`);
  }
}
