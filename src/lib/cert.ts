import type { AppSettings } from "./settings"
import { getProxiedUrl } from "@/lib/cors"

export interface NormalizedCert {
  not_before: string;
  not_after: string;
  common_name: string;
  issuer_name: string;
}

export async function queryCert(domain: string, settings: AppSettings): Promise<NormalizedCert[]> {
  domain = domain.trim().toLowerCase();

  return new Promise((resolve, reject) => {
    let errors: string[] = [];
    let completed = 0;
    let emptyResults = 0;

    const checkDone = () => {
      if (completed === 2) {
        // If both APIs successfully executed but found absolutely nothing
        if (emptyResults === 2) {
          resolve([]);
        } else {
          reject(new Error(`All sources failed. Details: ${errors.join(" | ")}`));
        }
      }
    };

    const handleResult = (data: NormalizedCert[]) => {
      if (data.length > 0) {
        // The first API to return actual data wins and resolves immediately
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

    // Fire both APIs simultaneously. Do not await them sequentially.
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

  // Route through the app's global CORS handler
  // Using 'any' casting to bypass TS warnings if your AppSettings interface 
  // doesn't explicitly type customProxyUrl yet.
  const proxyUrl = getProxiedUrl(
    targetUrl,
    settings.corsProvider as any,
    (settings as any).customProxyUrl
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const res = await fetch(proxyUrl, { signal: controller.signal });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - ${res.statusText}`);
  }

  const text = await res.text();
  if (!text || !text.trim()) return []; // crt.sh returns blank for no certs

  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) return [];

    return data.map((cert: any) => ({
      not_before: cert.not_before || '',
      not_after: cert.not_after || '',
      common_name: cert.common_name || cert.name_value || '',
      issuer_name: cert.issuer_name || ''
    }));
  } catch (err) {
    throw new Error('Returned HTML instead of JSON. The server is likely under heavy load.');
  }
}

async function fetchCertSpotter(domain: string, settings: AppSettings): Promise<NormalizedCert[]> {
  const targetUrl = `https://api.certspotter.com/v1/issuances?domain=${domain}&include_subdomains=true&expand=dns_names&expand=issuer`;

  const proxyUrl = getProxiedUrl(
    targetUrl,
    settings.corsProvider as any,
    (settings as any).customProxyUrl
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const res = await fetch(proxyUrl, {
    headers: { 'Accept': 'application/json' },
    signal: controller.signal
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    if (res.status === 404) return []; // CertSpotter returns 404 when a domain has 0 certificates
    throw new Error(`HTTP ${res.status} - ${res.statusText}`);
  }

  const text = await res.text();
  if (!text || !text.trim()) return [];

  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) return [];

    return data.map((cert: any) => ({
      not_before: cert.not_before ? cert.not_before.split('T')[0] : '',
      not_after: cert.not_after ? cert.not_after.split('T')[0] : '',
      common_name: cert.dns_names?.[0] || domain,
      issuer_name: cert.issuer?.name || ''
    }));
  } catch (err) {
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