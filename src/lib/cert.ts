import type { AppSettings } from "./settings"
import { getProxiedUrl, authenticatedFetch } from "@/lib/cors"
import { isCustomServerEnabled, queryCertServer } from "./apiServer"
export interface NormalizedCert {
  not_before: string;
  not_after: string;
  common_name: string;
  issuer_name: string;
}
export async function queryCert(domain: string, settings: AppSettings): Promise<NormalizedCert[]> {
  domain = domain.trim().toLowerCase();

  // If custom API server is enabled, fetch via edge cert endpoint
  if (isCustomServerEnabled(settings)) {
    const certs = (await queryCertServer(domain, settings)) as NormalizedCert[];
    return deduplicateCerts(certs || []);
  }

  const results = await Promise.allSettled([
    fetchCrtSh(domain, settings),
    fetchCertSpotter(domain, settings)
  ]);

  const allCerts: NormalizedCert[] = [];
  const errors: string[] = [];
  let successCount = 0;

  results.forEach((result, idx) => {
    const sourceName = idx === 0 ? "crt.sh" : "CertSpotter";
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
  const res = await authenticatedFetch(proxyUrl, { signal: controller.signal });
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