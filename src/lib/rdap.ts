import type { AppSettings } from "./settings"
import { getProxiedUrl, authenticatedFetch } from "./cors"
export async function queryRDAP(query: string, settings: AppSettings) {
  query = query.trim();
  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(query) || (query.includes(':') && !query.includes('.'));
  const basePath = isIP ? `ip/${query}` : `domain/${query}`;
  let url = `https://rdap.org/${basePath}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/rdap+json' } });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err: any) {
    if (settings.corsProvider !== 'none' && err.name === 'TypeError') {
      const proxyUrl = getProxiedUrl(url, settings.corsProvider, settings.customCorsUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const proxyRes = await authenticatedFetch(proxyUrl, { signal: controller.signal, headers: { 'Accept': 'application/rdap+json' } });
      clearTimeout(timeoutId);
      if (!proxyRes.ok) throw new Error(`HTTP error via proxy ${proxyRes.status}`);
      return await proxyRes.json();
    }
    throw err;
  }
}