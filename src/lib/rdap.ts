import type { AppSettings } from "./settings"

export async function queryRDAP(query: string, settings: AppSettings) {
  query = query.trim();
  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(query) || (query.includes(':') && !query.includes('.'));
  
  const basePath = isIP ? `ip/${query}` : `domain/${query}`;
  let url = `https://rdap.org/${basePath}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    // rdap.org redirects to the proper RDAP server for the TLD/IP.
    const res = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/rdap+json' } });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err: any) {
    // If it's a TypeError, it's likely a CORS error because rdap.org redirects 
    // to target servers that may lack CORS headers.
    if (settings.corsProxyUrl && err.name === 'TypeError') {
       const proxyUrl = `${settings.corsProxyUrl}${encodeURIComponent(url)}`;
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), 10000);
       const proxyRes = await fetch(proxyUrl, { signal: controller.signal, headers: { 'Accept': 'application/rdap+json' } });
       clearTimeout(timeoutId);
       if (!proxyRes.ok) throw new Error(`HTTP error via proxy ${proxyRes.status}`);
       return await proxyRes.json();
    }
    throw err;
  }
}
