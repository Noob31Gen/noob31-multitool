import type { AppSettings } from "./settings"

export async function fetchHeaders(url: string, settings: AppSettings) {
  if (!settings.corsProxyUrl) throw new Error("CORS Proxy URL is required for HTTP Header lookups. Please configure it in Settings.");
  
  // ensure url has scheme
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error("URL must start with http:// or https://");
  }

  const proxyUrl = `${settings.corsProxyUrl}${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch(proxyUrl, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeoutId);
    
    const headers: { key: string, value: string }[] = [];
    res.headers.forEach((value, key) => {
      headers.push({ key, value });
    });
    
    return {
      status: res.status,
      statusText: res.statusText,
      headers
    };
  } catch (err: any) {
    throw err;
  }
}
