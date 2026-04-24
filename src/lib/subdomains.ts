import type { AppSettings } from "./settings"
import { getProxiedUrl } from "@/lib/cors"

export interface SubdomainResult {
  subdomain: string;
  sources: string[];
}

export async function querySubdomains(
  domain: string, 
  settings: AppSettings,
  onProgress: (results: SubdomainResult[], errors: string[], sourceName: string) => void
): Promise<void> {
  domain = domain.trim().toLowerCase();
  
  const sources = [
    { name: 'HackerTarget', fn: fetchHackerTarget },
    { name: 'AlienVault OTX', fn: fetchAlienVault },
    { name: 'ThreatMiner', fn: fetchThreatMiner },
    { name: 'URLScan.io', fn: fetchUrlScan },
    { name: 'crt.sh', fn: fetchCrtSh },
    { name: 'CertSpotter', fn: fetchCertSpotter }
  ];

  const subdomainMap = new Map<string, Set<string>>();
  let allFailed = true;
  const errors: string[] = [];

  for (const source of sources) {
    try {
      const data = await source.fn(domain, settings);
      allFailed = false;
      
      data.forEach(({ subdomain, source }) => {
        if (!subdomainMap.has(subdomain)) {
          subdomainMap.set(subdomain, new Set());
        }
        subdomainMap.get(subdomain)!.add(source);
      });
    } catch (err: any) {
      errors.push(`${source.name}: ${err.message}`);
    }

    // Convert map to array and sort after each source
    const currentResults: SubdomainResult[] = Array.from(subdomainMap.entries()).map(([subdomain, sourcesSet]) => ({
      subdomain,
      sources: Array.from(sourcesSet).sort()
    }));
    currentResults.sort((a, b) => a.subdomain.localeCompare(b.subdomain));

    onProgress(currentResults, errors, source.name);
  }

  if (allFailed) {
    throw new Error(`All subdomain sources failed. Details: ${errors.join(" | ")}`);
  }
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

    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('API returned an HTML error page. The proxy or endpoint is likely blocked.');
    }
    const data = JSON.parse(text);
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

    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('API returned an HTML error page. The proxy or endpoint is likely blocked.');
    }
    const data = JSON.parse(text);
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
  const targetUrl = `https://urlscan.io/api/v1/search/?q=domain:${domain}&size=10000`;
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

    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('API returned an HTML error page. The proxy or endpoint is likely blocked.');
    }
    const data = JSON.parse(text);
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

async function fetchCrtSh(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://crt.sh/?q=%.${domain}&output=json`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('API returned an HTML error page. The proxy or endpoint is likely blocked.');
    }
    
    const data = JSON.parse(text);
    const results: { subdomain: string, source: string }[] = [];

    if (Array.isArray(data)) {
      for (const record of data) {
        if (record.common_name) {
          const names = record.common_name.split('\n');
          for (let name of names) {
             name = name.trim().toLowerCase();
             if (name.endsWith(domain) && !name.includes('*')) {
               results.push({ subdomain: name, source: 'crt.sh' });
             }
          }
        }
        if (record.name_value) {
          const names = record.name_value.split('\n');
          for (let name of names) {
             name = name.trim().toLowerCase();
             if (name.endsWith(domain) && !name.includes('*')) {
               results.push({ subdomain: name, source: 'crt.sh' });
             }
          }
        }
      }
    }
    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`crt.sh: ${error.message}`);
  }
}

async function fetchCertSpotter(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://api.certspotter.com/v1/issuances?domain=${domain}&include_subdomains=true&expand=dns_names`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(proxyUrl, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 404) return []; // CertSpotter returns 404 when 0 certs
      throw new Error(`HTTP ${res.status}`);
    }

    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('API returned an HTML error page. The proxy or endpoint is likely blocked.');
    }

    const data = JSON.parse(text);
    const results: { subdomain: string, source: string }[] = [];

    if (Array.isArray(data)) {
      for (const cert of data) {
        if (Array.isArray(cert.dns_names)) {
          for (let name of cert.dns_names) {
            name = name.trim().toLowerCase();
            if (name.endsWith(domain) && !name.includes('*')) {
              results.push({ subdomain: name, source: 'CertSpotter' });
            }
          }
        }
      }
    }
    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`CertSpotter: ${error.message}`);
  }
}
