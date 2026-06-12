import type { AppSettings } from "./settings"
import { getProxiedUrl, authenticatedFetch } from "@/lib/cors"
export interface NormalizedCert {
  not_before: string;
  not_after: string;
  common_name: string;
  issuer_name: string;
}
export async function queryCert(domain: string, settings: AppSettings): Promise<NormalizedCert[]> {
  domain = domain.trim().toLowerCase();
  const sources = [
    { name: "crt.sh", fn: () => fetchCrtSh(domain, settings) },
    { name: "CertSpotter", fn: () => fetchCertSpotter(domain, settings) }
  ];

  if (settings.censysApiId && settings.censysApiSecret) {
    sources.push({ name: "Censys", fn: () => fetchCensys(domain, settings) });
  }

  const results = await Promise.allSettled(sources.map(s => s.fn()));

  const allCerts: NormalizedCert[] = [];
  const errors: string[] = [];
  let successCount = 0;

  results.forEach((result, idx) => {
    const sourceName = sources[idx].name;
    if (result.status === 'fulfilled') {
      successCount++;
      if (result.value) {
        allCerts.push(...result.value);
      }
    } else {
      errors.push(`${sourceName}: ${result.reason?.message || result.reason}`);
    }
  });

  if (successCount === 0) {
    throw new Error(`All sources failed. Details: ${errors.join(" | ")}`);
  }

  return deduplicateCerts(allCerts);
}
async function fetchCrtSh(domain: string, settings: AppSettings): Promise<NormalizedCert[]> {
  const targetUrl = `https://crt.sh/?q=${domain}&output=json`;
  const proxyUrl = getProxiedUrl(
    targetUrl,
    settings.corsProvider as AppSettings['corsProvider'],
    settings.customCorsUrl
  );
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(proxyUrl, { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - ${res.statusText}`);
  }
  const text = await res.text();
  if (!text || !text.trim()) return [];
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) return [];
    return data.map((cert: { not_before?: string; not_after?: string; common_name?: string; name_value?: string; issuer_name?: string }) => ({
      not_before: cert.not_before || '',
      not_after: cert.not_after || '',
      common_name: cert.common_name || cert.name_value || '',
      issuer_name: cert.issuer_name || ''
    }));
  } catch {
    throw new Error('Returned HTML instead of JSON. The server is likely under heavy load.');
  }
}
async function fetchCertSpotter(domain: string, settings: AppSettings): Promise<NormalizedCert[]> {
  const targetUrl = `https://api.certspotter.com/v1/issuances?domain=${domain}&include_subdomains=true&expand=dns_names&expand=issuer`;
  const proxyUrl = getProxiedUrl(
    targetUrl,
    settings.corsProvider as AppSettings['corsProvider'],
    settings.customCorsUrl
  );
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const res = await authenticatedFetch(proxyUrl, {
    headers: { 'Accept': 'application/json' },
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`HTTP ${res.status} - ${res.statusText}`);
  }
  const text = await res.text();
  if (!text || !text.trim()) return [];
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) return [];
    return data.map((cert: { not_before?: string; not_after?: string; dns_names?: string[]; issuer?: { name?: string } }) => ({
      not_before: cert.not_before ? cert.not_before.split('T')[0] : '',
      not_after: cert.not_after ? cert.not_after.split('T')[0] : '',
      common_name: cert.dns_names?.[0] || domain,
      issuer_name: cert.issuer?.name || ''
    }));
  } catch {
    throw new Error('Returned HTML instead of JSON. The proxy failed to route the request.');
  }
}
async function fetchCensys(domain: string, settings: AppSettings): Promise<NormalizedCert[]> {
  const apiId = settings.censysApiId;
  const apiSecret = settings.censysApiSecret;
  if (!apiId || !apiSecret) return [];

  const targetUrl = `https://search.censys.io/api/v2/certificates/search?q=parsed.names:${domain}&per_page=50`;
  const proxyUrl = getProxiedUrl(
    targetUrl,
    settings.corsProvider as AppSettings['corsProvider'],
    settings.customCorsUrl
  );
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  
  try {
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Authorization': `Basic ${btoa(`${apiId}:${apiSecret}`)}`
    };
    
    const res = await authenticatedFetch(proxyUrl, {
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`HTTP ${res.status} - ${res.statusText}`);
    }
    const text = await res.text();
    if (!text || !text.trim()) return [];
    
    const data = JSON.parse(text);
    if (!data.result || !Array.isArray(data.result.hits)) return [];
    
    return data.result.hits.map((hit: {
      parsed?: {
        subject?: { common_name?: string | string[] };
        issuer?: { common_name?: string | string[] };
        validity?: { start?: string; end?: string };
      };
    }) => {
      const parsed = hit.parsed || {};
      const subjectCommonName = Array.isArray(parsed.subject?.common_name) 
        ? parsed.subject.common_name[0] 
        : parsed.subject?.common_name || '';
      const issuerCommonName = Array.isArray(parsed.issuer?.common_name)
        ? parsed.issuer.common_name[0]
        : parsed.issuer?.common_name || '';
      
      return {
        not_before: parsed.validity?.start ? parsed.validity.start.split('T')[0] : '',
        not_after: parsed.validity?.end ? parsed.validity.end.split('T')[0] : '',
        common_name: subjectCommonName || domain,
        issuer_name: issuerCommonName || ''
      };
    });
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}
function deduplicateCerts(certs: NormalizedCert[]): NormalizedCert[] {
  if (!certs || certs.length === 0) return [];
  const seen = new Set();
  return certs.filter(cert => {
    const hash = `${cert.common_name}-${cert.not_before}-${cert.not_after}`;
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });
}