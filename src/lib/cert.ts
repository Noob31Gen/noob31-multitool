import type { AppSettings } from "./settings"

export async function queryCert(domain: string, settings: AppSettings) {
  domain = domain.trim();
  
  const url = `https://crt.sh/?q=${domain}&output=json`;
  
  if (!settings.corsProxyUrl) {
    throw new Error("CORS Proxy is required for Certificate lookups. crt.sh does not provide CORS headers. Please configure a CORS Proxy URL in Settings.");
  }

  const proxyUrl = `${settings.corsProxyUrl}${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    throw err;
  }
}
