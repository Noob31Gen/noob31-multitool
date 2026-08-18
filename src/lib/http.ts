import type { AppSettings } from "./settings"
import { getProxiedUrl, authenticatedFetch } from "./cors"
import { isCustomServerEnabled, queryHttpHeadersServer } from "./apiServer"
export async function fetchHeaders(url: string, settings: AppSettings) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error("URL must start with http:// or https://");
  }

  if (isCustomServerEnabled(settings)) {
    const data = (await queryHttpHeadersServer(url, settings)) as {
      status: number;
      statusText: string;
      headers: { key: string; value: string }[];
      finalUrl?: string;
    };
    return {
      status: data.status || 200,
      statusText: data.statusText || 'OK',
      headers: data.headers || [],
      redirected: false,
      finalUrl: data.finalUrl || url,
    };
  }
  const proxyUrl = getProxiedUrl(url, settings.corsProvider, settings.customCorsUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const res_base = await authenticatedFetch(proxyUrl, { method: 'HEAD', signal: controller.signal });
  let res = res_base;
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
}