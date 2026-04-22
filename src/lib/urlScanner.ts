import type { AppSettings } from "./settings"

export interface ParsedUrl {
  original: string;
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  params: { key: string, value: string }[];
  isIp: boolean;
}

export interface VisitResult {
  status: number;
  statusText: string;
  headers: { key: string, value: string }[];
  redirected: boolean;
  finalUrl: string;
}

export function parseUrl(input: string): ParsedUrl {
  let urlToParse = input.trim();
  
  // URL constructor requires a protocol
  if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://') && !urlToParse.startsWith('ftp://')) {
    urlToParse = 'https://' + urlToParse;
  }

  const url = new URL(urlToParse);
  const params: { key: string, value: string }[] = [];
  
  url.searchParams.forEach((value, key) => {
    params.push({ key, value });
  });

  const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(url.hostname) || (url.hostname.includes(':') && !url.hostname.includes('.'));

  return {
    original: input,
    protocol: url.protocol,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    params,
    isIp
  };
}

export async function visitUrl(url: string, settings: AppSettings): Promise<VisitResult> {
  if (!settings.corsProxyUrl) {
    throw new Error("CORS Proxy URL is required to visit URLs. Please configure it in Settings.");
  }
  
  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const proxyUrl = `${settings.corsProxyUrl}${encodeURIComponent(targetUrl)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    let res = await fetch(proxyUrl, { method: 'HEAD', signal: controller.signal });
    if (res.status === 405) {
      res = await fetch(proxyUrl, { method: 'GET', signal: controller.signal });
    }
    clearTimeout(timeoutId);
    
    const headers: { key: string, value: string }[] = [];
    res.headers.forEach((value, key) => {
      headers.push({ key, value });
    });
    
    // Some proxies return their own URL as res.url, or a custom header for the final destination
    // For standard fetch, res.redirected indicates if a redirect happened.
    let finalUrl = res.url;
    // corsproxy.io adds a custom header for the actual final URL sometimes, or we just trust res.url if it reflects it
    // Actually corsproxy.io doesn't cleanly expose the redirected URL of the TARGET if it follows it internally,
    // but we can report what fetch tells us.
    
    return {
      status: res.status,
      statusText: res.statusText,
      headers,
      redirected: res.redirected,
      finalUrl
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}
