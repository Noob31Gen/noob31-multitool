import type { AppSettings } from "./settings"
import type { CorsProvider } from "./cors"
import { getProxiedUrl, authenticatedFetch } from "@/lib/cors"
import { logger } from "./logger"

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

// Robust fallback fetching mechanism that automatically cycles through alternative CORS proxies if one fails or rate-limits
async function fetchWithProxyFallback(
  targetUrl: string,
  settings: AppSettings,
  headers: HeadersInit = {},
  timeout = 4000
): Promise<Response> {
  const providers: CorsProvider[] = [
    settings.corsProvider,
    'codetabs',
    'corsproxy',
    'none'
  ];
  
  const uniqueProviders = Array.from(new Set(providers));
  let lastError: Error | null = null;
  
  for (const provider of uniqueProviders) {
    const proxyUrl = getProxiedUrl(targetUrl, provider, settings.customCorsUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const res = await authenticatedFetch(proxyUrl, {
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html') && !targetUrl.includes('crt.sh/?q=') && !targetUrl.includes('web.archive.org')) {
          const text = await res.clone().text();
          if (text.includes('Too Many Requests') || text.includes('Rate Limit') || text.includes('Block') || text.includes('Cloudflare')) {
            throw new Error(`Proxy '${provider}' rate-limited or blocked.`);
          }
        }
        return res;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.warn(`Fetch via proxy provider '${provider}' failed for '${targetUrl}':`, err);
    }
  }
  throw lastError || new Error(`Failed to fetch '${targetUrl}' through all proxy fallbacks.`);
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
    { name: 'Wayback Machine', fn: fetchWaybackMachine },
    { name: 'AlienVault OTX', fn: fetchAlienVaultOTX },
    { name: 'ThreatMiner', fn: fetchThreatMiner },
    { name: 'Subdomain Center', fn: fetchSubdomainCenter }
  ];
  
  const subdomainMap = new Map<string, Set<string>>();
  let successCount = 0;
  const errors: string[] = [];

  const runQuery = async (source: typeof sources[0]) => {
    try {
      const data = await source.fn(domain, settings);
      successCount++;
      data.forEach(({ subdomain, source: srcName }) => {
        if (!subdomainMap.has(subdomain)) {
          subdomainMap.set(subdomain, new Set());
        }
        subdomainMap.get(subdomain)!.add(srcName);
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${source.name}: ${message}`);
    }
    
    // Output progress update as queries complete
    const currentResults: SubdomainResult[] = Array.from(subdomainMap.entries()).map(([subdomain, sourcesSet]) => ({
      subdomain,
      sources: Array.from(sourcesSet).sort()
    }));
    currentResults.sort((a, b) => a.subdomain.localeCompare(b.subdomain));
    onProgress(currentResults, errors, source.name);
  };

  // Run all lookups concurrently
  await Promise.all(sources.map(s => runQuery(s)));

  if (successCount === 0) {
    throw new Error(`All subdomain sources failed. Details: ${errors.join(" | ")}`);
  }
}

async function fetchHackerTarget(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://api.hackertarget.com/hostsearch/?q=${domain}`;
  try {
    const res = await fetchWithProxyFallback(targetUrl, settings);
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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}`);
  }
}

async function fetchUrlScan(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://urlscan.io/api/v1/search/?q=domain:${domain}&size=10000`;
  try {
    const res = await fetchWithProxyFallback(targetUrl, settings, { 'Accept': 'application/json' });
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('API returned an HTML error page. The endpoint is likely blocked.');
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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}`);
  }
}

async function fetchCrtSh(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://crt.sh/?q=%.${domain}&output=json`;
  try {
    const res = await fetchWithProxyFallback(targetUrl, settings);
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('API returned HTML output. The crt.sh server might be overloaded.');
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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}`);
  }
}

async function fetchCertSpotter(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://api.certspotter.com/v1/issuances?domain=${domain}&include_subdomains=true&expand=dns_names`;
  try {
    const res = await fetchWithProxyFallback(targetUrl, settings, { 'Accept': 'application/json' });
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('API returned HTML output. The endpoint may be rate-limited.');
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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}`);
  }
}

async function fetchAnubis(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://jldc.me/anubis/subdomains/${domain}`;
  try {
    const res = await fetchWithProxyFallback(targetUrl, settings);
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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}`);
  }
}

async function fetchMnemonic(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://api.mnemonic.no/pdns/v3/${domain}`;
  try {
    const res = await fetchWithProxyFallback(targetUrl, settings);
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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}`);
  }
}

async function fetchWaybackMachine(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `http://web.archive.org/cdx/search/cdx?url=*.${domain}/*&output=json&collapse=urlkey&fl=original&limit=10000`;
  try {
    const res = await fetchWithProxyFallback(targetUrl, settings);
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('API returned HTML instead of JSON');
    }
    const data = JSON.parse(text);
    const results: { subdomain: string, source: string }[] = [];
    if (Array.isArray(data) && data.length > 1) {
      const chunkSize = 1000;
      for (let i = 1; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        for (const row of chunk) {
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
        if (i + chunkSize < data.length) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }
    return results;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}`);
  }
}

async function fetchBufferOver(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://tls.bufferover.run/dns?q=.${domain}`;
  try {
    const res = await fetchWithProxyFallback(targetUrl, settings);
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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}`);
  }
}

async function fetchAlienVaultOTX(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://otx.alienvault.com/api/v1/indicators/domain/${domain}/passive_dns`;
  try {
    const res = await fetchWithProxyFallback(targetUrl, settings);
    const data = await res.json();
    const results: { subdomain: string, source: string }[] = [];
    if (data && Array.isArray(data.passive_dns)) {
      for (const record of data.passive_dns) {
        if (record && record.hostname) {
          const validSub = extractValidSubdomain(record.hostname, domain);
          if (validSub) {
            results.push({ subdomain: validSub, source: 'AlienVault OTX' });
          }
        }
      }
    }
    return results;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}`);
  }
}

async function fetchThreatMiner(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://api.threatminer.org/v2/domain.php?q=${domain}&rt=5`;
  try {
    const res = await fetchWithProxyFallback(targetUrl, settings);
    const data = await res.json();
    const results: { subdomain: string, source: string }[] = [];
    if (data && Array.isArray(data.results)) {
      for (const sub of data.results) {
        if (typeof sub === 'string') {
          const validSub = extractValidSubdomain(sub, domain);
          if (validSub) {
            results.push({ subdomain: validSub, source: 'ThreatMiner' });
          }
        }
      }
    }
    return results;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}`);
  }
}

async function fetchSubdomainCenter(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://api.subdomain.center/api4?domain=${domain}`;
  try {
    const res = await fetchWithProxyFallback(targetUrl, settings);
    const data = await res.json();
    const results: { subdomain: string, source: string }[] = [];
    if (Array.isArray(data)) {
      for (const sub of data) {
        if (typeof sub === 'string') {
          const validSub = extractValidSubdomain(sub, domain);
          if (validSub) {
            results.push({ subdomain: validSub, source: 'Subdomain Center' });
          }
        }
      }
    }
    return results;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}`);
  }
}