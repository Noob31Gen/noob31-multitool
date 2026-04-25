import type { AppSettings } from "./settings"
import { getProxiedUrl } from "@/lib/cors"

export interface SubdomainResult {
  subdomain: string;
  sources: string[];
}

function extractValidSubdomain(sub: string, domain: string): string | null {
  if (!sub) return null;
  let cleanSub = sub.trim().toLowerCase();
  
  // Remove protocol
  cleanSub = cleanSub.replace(/^https?:\/\//, '');
  
  // Remove any path, query, fragment, port
  cleanSub = cleanSub.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
  
  // Strip wildcard prefix
  if (cleanSub.startsWith('*.')) {
    cleanSub = cleanSub.substring(2);
  }

  // Validate characters (RFC 1123 loosely)
  if (!/^[a-z0-9.-]+$/.test(cleanSub) || cleanSub.includes('..')) {
    return null;
  }

  // Exact match or proper subdomain
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
    { name: 'AlienVault OTX', fn: fetchAlienVault },
    { name: 'ThreatMiner', fn: fetchThreatMiner },
    { name: 'URLScan.io', fn: fetchUrlScan },
    { name: 'crt.sh', fn: fetchCrtSh },
    { name: 'CertSpotter', fn: fetchCertSpotter },
    { name: 'Anubis', fn: fetchAnubis },
    { name: 'Mnemonic', fn: fetchMnemonic },
    { name: 'ThreatCrowd', fn: fetchThreatCrowd },
    { name: 'BufferOver', fn: fetchBufferOver },
    { name: 'Omnisint', fn: fetchOmnisint },
    { name: 'Columbus Project', fn: fetchColumbus },
    { name: 'Riddler', fn: fetchRiddler },
    { name: 'Subdomain Center', fn: fetchSubdomainCenter },
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
      if (parts.length > 0) {
        const validSub = extractValidSubdomain(parts[0], domain);
        if (validSub) {
          results.push({ subdomain: validSub, source: 'HackerTarget' });
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
          const validSub = extractValidSubdomain(record.hostname, domain);
          if (validSub) {
            results.push({ subdomain: validSub, source: 'AlienVault OTX' });
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
          const validSub = extractValidSubdomain(record, domain);
          if (validSub) {
            results.push({ subdomain: validSub, source: 'ThreatMiner' });
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
          const validSub = extractValidSubdomain(record.page.domain, domain);
          if (validSub) {
            results.push({ subdomain: validSub, source: 'URLScan.io' });
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
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`CertSpotter: ${error.message}`);
  }
}

async function fetchAnubis(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://jldc.me/anubis/subdomains/${domain}`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
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
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`Anubis: ${error.message}`);
  }
}

async function fetchMnemonic(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://api.mnemonic.no/pdns/v3/${domain}`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
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
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`Mnemonic: ${error.message}`);
  }
}

async function fetchWaybackMachine(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `http://web.archive.org/cdx/search/cdx?url=*.${domain}/*&output=json&collapse=urlkey&fl=original`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('API returned HTML instead of JSON');
    }
    
    const data = JSON.parse(text);
    const results: { subdomain: string, source: string }[] = [];
    
    if (Array.isArray(data) && data.length > 1) {
      // Skip header row
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
          } catch (e) {
            // Ignore parsing errors for individual URLs
          }
        }
      }
    }
    
    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`Wayback Machine: ${error.message}`);
  }
}

async function fetchThreatCrowd(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://www.threatcrowd.org/searchApi/v2/domain/report/?domain=${domain}`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) throw new Error('API returned HTML instead of JSON');
    
    const data = JSON.parse(text);
    const results: { subdomain: string, source: string }[] = [];
    
    if (data && Array.isArray(data.subdomains)) {
      for (const sub of data.subdomains) {
        if (typeof sub === 'string') {
          const validSub = extractValidSubdomain(sub, domain);
          if (validSub) results.push({ subdomain: validSub, source: 'ThreatCrowd' });
        }
      }
    }
    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`ThreatCrowd: ${error.message}`);
  }
}

async function fetchBufferOver(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://tls.bufferover.run/dns?q=.${domain}`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
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
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`BufferOver: ${error.message}`);
  }
}

async function fetchOmnisint(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://sonar.omnisint.io/subdomains/${domain}`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) throw new Error('API returned HTML instead of JSON');
    
    const data = JSON.parse(text);
    const results: { subdomain: string, source: string }[] = [];
    
    if (Array.isArray(data)) {
      for (const sub of data) {
        if (typeof sub === 'string') {
          const validSub = extractValidSubdomain(sub, domain);
          if (validSub) results.push({ subdomain: validSub, source: 'Omnisint' });
        }
      }
    }
    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`Omnisint: ${error.message}`);
  }
}

async function fetchColumbus(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://columbus.elmasy.com/api/lookup/${domain}`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const text = await res.text();
    const results: { subdomain: string, source: string }[] = [];
    
    for (const line of text.split('\n')) {
      const sub = line.trim();
      if (sub) {
        const fullSub = sub.endsWith(domain) ? sub : `${sub}.${domain}`;
        const validSub = extractValidSubdomain(fullSub, domain);
        if (validSub) results.push({ subdomain: validSub, source: 'Columbus Project' });
      }
    }
    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`Columbus Project: ${error.message}`);
  }
}

async function fetchRiddler(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://riddler.io/search/exportcsv?q=pld:${domain}`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const text = await res.text();
    const results: { subdomain: string, source: string }[] = [];
    
    const escapedDomain = domain.replace(/\./g, '\\.');
    const regex = new RegExp(`[a-zA-Z0-9.-]*${escapedDomain}`, 'gi');
    const matches = text.match(regex);
    
    if (matches) {
      for (const match of matches) {
        const validSub = extractValidSubdomain(match, domain);
        if (validSub) results.push({ subdomain: validSub, source: 'Riddler' });
      }
    }
    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`Riddler: ${error.message}`);
  }
}

async function fetchSubdomainCenter(domain: string, settings: AppSettings): Promise<{ subdomain: string, source: string }[]> {
  const targetUrl = `https://api.subdomain.center/?domain=${domain}`;
  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider as any, (settings as any).customProxyUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) throw new Error('API returned HTML instead of JSON');
    
    const data = JSON.parse(text);
    const results: { subdomain: string, source: string }[] = [];
    
    if (Array.isArray(data)) {
      for (const sub of data) {
        if (typeof sub === 'string') {
          const validSub = extractValidSubdomain(sub, domain);
          if (validSub) results.push({ subdomain: validSub, source: 'Subdomain Center' });
        }
      }
    }
    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`Subdomain Center: ${error.message}`);
  }
}