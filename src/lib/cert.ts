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
  return new Promise((resolve, reject) => {
    const errors: string[] = [];
    let completed = 0;
    let emptyResults = 0;
    const checkDone = () => {
      if (completed === 2) {
        if (emptyResults === 2) {
          resolve([]);
        } else {
          reject(new Error(`All sources failed. Details: ${errors.join(" | ")}`));
        }
      }
    };
    const handleResult = (data: NormalizedCert[]) => {
      if (data.length > 0) {
        resolve(deduplicateCerts(data));
      } else {
        emptyResults++;
        completed++;
        checkDone();
      }
    };
    const handleError = (source: string, err: Error) => {
      errors.push(`${source}: ${err.message}`);
      completed++;
      checkDone();
    };
    fetchCrtSh(domain, settings)
      .then(handleResult)
      .catch(err => handleError("crt.sh", err));
    fetchCertSpotter(domain, settings)
      .then(handleResult)
      .catch(err => handleError("CertSpotter", err));
  });
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