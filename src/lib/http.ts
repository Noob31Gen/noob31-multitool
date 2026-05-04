import type { AppSettings } from "./settings"
import { getProxiedUrl, authenticatedFetch } from "./cors"
export async function fetchHeaders(url: string, settings: AppSettings) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error("URL must start with http:// or https://");
  }
  const proxyUrl = getProxiedUrl(url, settings.corsProvider, settings.customCorsUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    let res = await authenticatedFetch(proxyUrl, { method: 'HEAD', signal: controller.signal });
    if (res.status === 405) {
      res = await authenticatedFetch(proxyUrl, { method: 'GET', signal: controller.signal });
    }
    clearTimeout(timeoutId);
    const headers: { key: string, value: string }[] = [];
    res.headers.forEach((value, key) => {
      headers.push({ key, value });
    });
    return {
      status: res.status,
      statusText: res.statusText,
      headers,
      redirected: res.redirected,
      finalUrl: res.url
    };
  } catch (err: any) {
    throw err;
  }
}