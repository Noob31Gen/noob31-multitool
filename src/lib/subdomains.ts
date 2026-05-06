import type { AppSettings } from "./settings"
import { getProxiedUrl, authenticatedFetch } from "@/lib/cors"
export interface SubdomainResult {
  subdomain: string;
  sources: string[];
}
function extractValidSubdomain(sub: string, domain: string): string | null {
  if (!sub) return null;
  let cleanSub = sub.trim().toLowerCase();
  cleanSub = cleanSub.replace(/^https?:\/\//, '');
  cleanSub = cleanSub.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
  if (cleanSub.startsWith('*.')) {
    cleanSub = cleanSub.substring(2);
  }
  if (!/^[a-z0-9.-]+$/.test(cleanSub) || cleanSub.includes('..')) {
    return null;
  }
  if (cleanSub === domain || cleanSub.endsWith(`.${domain}`)) {
    return cleanSub;
  }
  return null;
}
export async function querySubdomains(
  domain: string,
  settings: AppSettings,
  onProgress: (results: SubdomainResult[], errors: string[], sourceName: string) => void
): Promise<void> {
  domain = domain.trim().toLowerCase();
  const sources = [
    { name: 'HackerTarget', fn: fetchHackerTarget },
    { name: 'URLScan.io', fn: fetchUrlScan },
    { name: 'crt.sh', fn: fetchCrtSh },
    { name: 'CertSpotter', fn: fetchCertSpotter },
    { name: 'Anubis', fn: fetchAnubis },
    { name: 'Mnemonic', fn: fetchMnemonic },
    { name: 'BufferOver', fn: fetchBufferOver },
    { name: 'Wayback Machine', fn: fetchWaybackMachine }
  ];
  const subdomainMap = new Map<string, Set<string>>();
  let allFailed = true;
  const errors: string[] = [];
  for (const source of sources) {
    try {
      const data: { subdomain: string; source: string }[] = await source.fn(domain, settings);
      allFailed = false;
      data.forEach(({ subdomain, source }: { subdomain: string; source: string }) => {
        if (!subdomainMap.has(subdomain)) {
          subdomainMap.set(subdomain, new Set());
        }
        subdomainMap.get(subdomain)!.add(source);
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${source.name}: ${message}`);
    }
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
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await authenticatedFetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.includes("error") || text.includes("API count exceeded")) {
      throw new Error(`HackerTarget API Error: ${text.trim()}`);
    }
    const lines = text.split('\n');
    const results: { subdomain: string, source: string }[] = [];
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length > 0) {
        const validSub = extractValidSubdomain(parts[0], domain);
        if (validSub) {
          results.push({ subdomain: validSub, source: 'HackerTarget' });
        }
      }
    }
    return results;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}`);
  }
}
async function fetchUrlScan(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://urlscan.io/api/v1/search/?q=domain:${domain}&size=10000`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await authenticatedFetch(proxyUrl, {
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
          const validSub = extractValidSubdomain(record.page.domain, domain);
          if (validSub) {
            results.push({ subdomain: validSub, source: 'URLScan.io' });
          }
        }
      }
    }
    return results;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Source Error: ${message}`);
  }
}
async function fetchCrtSh(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://crt.sh/?q=%.${domain}&output=json`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await authenticatedFetch(proxyUrl, { signal: controller.signal });
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
          for (const name of names) {
            const validSub = extractValidSubdomain(name, domain);
            if (validSub) {
              results.push({ subdomain: validSub, source: 'crt.sh' });
            }
          }
        }
        if (record.name_value) {
          const names = record.name_value.split('\n');
          for (const name of names) {
            const validSub = extractValidSubdomain(name, domain);
            if (validSub) {
              results.push({ subdomain: validSub, source: 'crt.sh' });
            }
          }
        }
      }
    }
    return results;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`crt.sh: ${message}`);
  }
}
async function fetchCertSpotter(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://api.certspotter.com/v1/issuances?domain=${domain}&include_subdomains=true&expand=dns_names`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await authenticatedFetch(proxyUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      if (res.status === 404) return [];
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
          for (const name of cert.dns_names) {
            const validSub = extractValidSubdomain(name, domain);
            if (validSub) {
              results.push({ subdomain: validSub, source: 'CertSpotter' });
            }
          }
        }
      }
    }
    return results;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`CertSpotter: ${message}`);
  }
}
async function fetchAnubis(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://jldc.me/anubis/subdomains/${domain}`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await authenticatedFetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('API returned HTML instead of JSON');
    }
    const data = JSON.parse(text);
    const results: { subdomain: string, source: string }[] = [];
    if (Array.isArray(data)) {
      for (const sub of data) {
        if (typeof sub === 'string') {
          const validSub = extractValidSubdomain(sub, domain);
          if (validSub) results.push({ subdomain: validSub, source: 'Anubis' });
        }
      }
    }
    return results;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Anubis: ${message}`);
  }
}
async function fetchMnemonic(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://api.mnemonic.no/pdns/v3/${domain}`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await authenticatedFetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('API returned HTML instead of JSON');
    }
    const data = JSON.parse(text);
    const results: { subdomain: string, source: string }[] = [];
    if (data && Array.isArray(data.data)) {
      for (const record of data.data) {
        if (record && record.query) {
          const validSub = extractValidSubdomain(record.query, domain);
          if (validSub) results.push({ subdomain: validSub, source: 'Mnemonic' });
        }
      }
    }
    return results;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Mnemonic: ${message}`);
  }
}
async function fetchWaybackMachine(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `http://web.archive.org/cdx/search/cdx?url=*.${domain}/*&output=json&collapse=urlkey&fl=original`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await authenticatedFetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('API returned HTML instead of JSON');
    }
    const data = JSON.parse(text);
    const results: { subdomain: string, source: string }[] = [];
    if (Array.isArray(data) && data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (Array.isArray(row) && row.length > 0) {
          try {
            let hostname = "";
            if (row[0].startsWith('http')) {
              const url = new URL(row[0]);
              hostname = url.hostname;
            } else {
              hostname = row[0];
            }
            const validSub = extractValidSubdomain(hostname, domain);
            if (validSub) results.push({ subdomain: validSub, source: 'Wayback Machine' });
          } catch { /* ignore */ }
        }
      }
    }
    return results;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Wayback Machine: ${message}`);
  }
}
async function fetchBufferOver(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://tls.bufferover.run/dns?q=.${domain}`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await authenticatedFetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) throw new Error('API returned HTML instead of JSON');
    const data = JSON.parse(text);
    const results: { subdomain: string, source: string }[] = [];
    if (data && Array.isArray(data.FDNS_A)) {
      for (const record of data.FDNS_A) {
        if (typeof record === 'string') {
          const parts = record.split(',');
          if (parts.length > 1) {
            const validSub = extractValidSubdomain(parts[1], domain);
            if (validSub) results.push({ subdomain: validSub, source: 'BufferOver' });
          }
        }
      }
    }
    return results;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`BufferOver: ${message}`);
  }
}