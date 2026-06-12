import type { AppSettings } from "./settings"
import { getProxiedUrl, authenticatedFetch } from "./cors"

export async function queryRDAP(query: string, settings: AppSettings) {
  query = query.trim();
  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(query) || (query.includes(':') && !query.includes('.'));
  const basePath = isIP ? `ip/${query}` : `domain/${query}`;
  const url = `https://rdap.org/${basePath}`;
  
  // 1. Consult localStorage cache first (1-hour cache TTL)
  const cacheKey = `rdap_${query.toLowerCase()}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 3600000) { 
        return parsed.data;
      }
    }
  } catch { /* ignore localStorage issues */ }

  const fetchWithProxy = async (targetUrl: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(targetUrl, { signal: controller.signal, headers: { 'Accept': 'application/rdap+json' } });
      clearTimeout(timeoutId);
      if (res.ok) return await res.json();
      throw new Error(`HTTP error ${res.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  const fetchWithProxyAndAuth = async (targetUrl: string) => {
    const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await authenticatedFetch(proxyUrl, { signal: controller.signal, headers: { 'Accept': 'application/rdap+json' } });
      clearTimeout(timeoutId);
      if (res.ok) return await res.json();
      throw new Error(`HTTP error via proxy ${res.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  const tryQuery = async (targetUrl: string) => {
    try {
      return await fetchWithProxy(targetUrl);
    } catch {
      if (settings.corsProvider !== 'none') {
        return await fetchWithProxyAndAuth(targetUrl);
      }
      throw new Error(`Failed to fetch ${targetUrl}`);
    }
  };

  try {
    const data = await tryQuery(url);
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
    } catch { /* ignore */ }
    return data;
  } catch (err: unknown) {
    // Fallback: If rdap.org fails and it's an IP address, query regional registries directly
    if (isIP) {
      const rirEndpoints = [
        `https://rdap.arin.net/registry/ip/${query}`,
        `https://rdap.db.ripe.net/ip/${query}`,
        `https://rdap.apnic.net/ip/${query}`,
        `https://rdap.lacnic.net/rdap/ip/${query}`,
        `https://rdap.afrinic.net/rdap/ip/${query}`
      ];
      for (const endpoint of rirEndpoints) {
        try {
          const data = await tryQuery(endpoint);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
          } catch { /* ignore */ }
          return data;
        } catch { /* ignore and try next */ }
      }
    }
    throw err;
  }
}