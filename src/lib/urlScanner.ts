import type { AppSettings } from "./settings"
import { logger } from "./logger"
export interface UrlComponent {
  label: string;
  value: string;
  raw?: string;
  highlight?: string;
}
export interface ParsedUrl {
  original: string;
  normalized: string;
  length: number;
  scheme: {
    value: string;
    isSecure: boolean;
    defaultPort: string;
  };
  authority: {
    full: string;
    userinfo: {
      username: string;
      password: string;
      hasCredentials: boolean;
    };
    host: {
      full: string;
      hostname: string;
      isIp: boolean;
      isIpv6: boolean;
      isLocalhost: boolean;
      registeredDomain: string;
      tld: string;
      sld: string;
      subdomain: string;
      labels: string[];
    };
    port: {
      value: string;
      isDefault: boolean;
      number: number | null;
    };
  };
  path: {
    full: string;
    segments: string[];
    depth: number;
    filename: string;
    fileExtension: string;
    directoryPath: string;
    isDirectory: boolean;
  };
  query: {
    full: string;
    params: { key: string; value: string; decoded: string }[];
    count: number;
  };
  fragment: {
    value: string;
    decoded: string;
    hasFragment: boolean;
  };
  passiveRedirects: {
    key: string;
    url: string;
    host: string;
  }[];
  meta: {
    isEncoded: boolean;
    hasTrailingSlash: boolean;
    idn: boolean;
    isDataUri: boolean;
    encodedCharacters: { char: string; encoded: string; position: number }[];
  };
}
export interface VisitResult {
  status: number;
  statusText: string;
  headers: { key: string; value: string }[];
  redirected: boolean;
  finalUrl: string;
  responseTime: number;
  contentType: string;
  server: string;
  redirectChain?: string[];
}
const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443',
  'ftp:': '21',
  'ftps:': '990',
  'ssh:': '22',
  'ws:': '80',
  'wss:': '443',
};

let TLD_LIST = new Set(['com', 'org', 'net', 'edu', 'gov', 'mil', 'co', 'io', 'ai', 'dev', 'app', 'xyz', 'info', 'me', 'in', 'uk', 'us', 'de', 'fr', 'jp', 'cn', 'ru', 'br', 'au', 'ca', 'it', 'nl', 'es', 'ch', 'se', 'no', 'fi', 'dk', 'at', 'be', 'pt', 'pl', 'gr', 'ie', 'cz', 'hu', 'ro', 'tr', 'kr', 'id', 'th', 'vn', 'my', 'ph', 'sg', 'hk', 'tw', 'mx', 'ar', 'cl', 'co', 'pe', 've', 'za', 'ng', 'eg', 'ke', 'ma', 'dz', 'tn', 'ly', 'sd', 'gh', 'ci', 'sn', 'cm', 'et', 'tz', 'ug', 'zm', 'zw', 'na', 'bw', 'mu', 'sc', 're', 'yt', 'km', 'mg', 'mr', 'ml', 'bf', 'ne', 'td', 'cf', 'ss', 'dj', 'er', 'so', 'gw', 'sl', 'lr', 'tg', 'bj', 'gx', 'ga', 'st', 'ao', 'na', 'ls', 'sz', 'mw', 'mz', 'bi', 'rw']);

export async function refreshTldList() {
  try {
    const res = await fetch('https://data.iana.org/TLD/tlds-alpha-by-domain.txt');
    if (!res.ok) return;
    const text = await res.text();
    const tlds = text.split('\n')
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.trim().toLowerCase());
    if (tlds.length > 0) {
      TLD_LIST = new Set(tlds);
    }
  } catch (e) {
    logger.warn('Failed to fetch IANA TLD list, using defaults:', e);
  }
}

refreshTldList();

function looksLikeDomain(text: string): boolean {
  const parts = text.split('/');
  const possibleDomain = parts[0];
  if (!possibleDomain.includes('.')) return false;

  const domainParts = possibleDomain.split('.');
  const tld = domainParts[domainParts.length - 1].toLowerCase();

  return domainParts.length >= 2 && TLD_LIST.has(tld);
}

export function parseUrl(input: string): ParsedUrl {
  let urlToParse = input.trim();
  const isDataUri = urlToParse.toLowerCase().startsWith('data:');
  if (!isDataUri && !urlToParse.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
    urlToParse = 'https://' + urlToParse;
  }
  const url = new URL(urlToParse);
  const scheme = {
    value: url.protocol.replace(':', ''),
    isSecure: url.protocol === 'https:' || url.protocol === 'wss:' || url.protocol === 'ftps:',
    defaultPort: DEFAULT_PORTS[url.protocol] || '',
  };
  const hostname = url.hostname;
  const isIpv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
  const isIpv6 = hostname.startsWith('[') || /^[0-9a-fA-F:]+$/.test(hostname);
  const isIp = isIpv4 || isIpv6;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  let tld = "", sld = "", subdomain = "", registeredDomain = "";
  const labels = hostname.split('.');
  if (!isIp && labels.length >= 2) {
    tld = labels[labels.length - 1];
    sld = labels[labels.length - 2];
    if (['co', 'com', 'org', 'net', 'edu', 'gov', 'ac', 'mil'].includes(sld) && tld.length === 2 && labels.length >= 3) {
      tld = sld + '.' + tld;
      sld = labels[labels.length - 3];
      subdomain = labels.slice(0, labels.length - 3).join('.');
    } else {
      subdomain = labels.slice(0, labels.length - 2).join('.');
    }
    registeredDomain = sld + '.' + tld;
  } else if (!isIp && labels.length === 1) {
    tld = labels[0];
  }
  const portValue = url.port;
  const isDefaultPort = !portValue || portValue === DEFAULT_PORTS[url.protocol];
  const pathSegments = url.pathname.split('/').filter(s => s.length > 0);
  let filename = "";
  let fileExtension = "";
  let directoryPath = url.pathname;
  const isDirectory = url.pathname.endsWith('/') || pathSegments.length === 0;
  if (pathSegments.length > 0) {
    const lastSeg = pathSegments[pathSegments.length - 1];
    if (lastSeg.includes('.') && !url.pathname.endsWith('/')) {
      filename = lastSeg;
      fileExtension = lastSeg.split('.').pop() || "";
      directoryPath = '/' + pathSegments.slice(0, -1).join('/');
      if (directoryPath !== '/') directoryPath += '/';
    }
  }
  const params: { key: string; value: string; decoded: string }[] = [];
  url.searchParams.forEach((value, key) => {
    params.push({
      key,
      value,
      decoded: decodeURIComponent(value),
    });
  });

  const redirectParams = ['url', 'u', 'target', 'dest', 'destination', 'link', 'to', 'r', 'out', 'go', 'next', 'forward', 'click', 'href', 'site', 'view', 'redirect', 'redir', 'return'];

  const passiveRedirects: { key: string; url: string; host: string }[] = [];
  params.forEach(p => {
    const val = p.decoded.trim();
    const isFullUrl = val.startsWith('http://') || val.startsWith('https://');
    const isRedirectKey = redirectParams.includes(p.key.toLowerCase());

    if (isFullUrl || looksLikeDomain(val) || isRedirectKey) {
      try {
        const urlToParse = isFullUrl ? val : 'https://' + val;
        const u = new URL(urlToParse);
        passiveRedirects.push({
          key: p.key,
          url: val,
          host: u.hostname,
        });
      } catch { /* ignore */ }
    }
  });
  const fragment = url.hash.replace('#', '');
  const encodedChars: { char: string; encoded: string; position: number }[] = [];
  const encodedRegex = /%([0-9A-Fa-f]{2})/g;
  let match;
  while ((match = encodedRegex.exec(input)) !== null) {
    try {
      encodedChars.push({
        char: decodeURIComponent(match[0]),
        encoded: match[0],
        position: match.index,
      });
    } catch { /* ignore */ }
  }
  const idn = hostname.startsWith('xn--') || labels.some(l => l.startsWith('xn--'));
  return {
    original: input,
    normalized: url.href,
    length: input.length,
    scheme,
    authority: {
      full: url.host,
      userinfo: {
        username: url.username,
        password: url.password,
        hasCredentials: !!(url.username || url.password),
      },
      host: {
        full: url.host,
        hostname,
        isIp,
        isIpv6,
        isLocalhost,
        registeredDomain,
        tld,
        sld,
        subdomain,
        labels,
      },
      port: {
        value: portValue || DEFAULT_PORTS[url.protocol] || '',
        isDefault: isDefaultPort,
        number: portValue ? parseInt(portValue) : (DEFAULT_PORTS[url.protocol] ? parseInt(DEFAULT_PORTS[url.protocol]) : null),
      },
    },
    path: {
      full: url.pathname,
      segments: pathSegments,
      depth: pathSegments.length,
      filename,
      fileExtension,
      directoryPath,
      isDirectory,
    },
    query: {
      full: url.search,
      params,
      count: params.length,
    },
    fragment: {
      value: fragment,
      decoded: fragment ? decodeURIComponent(fragment) : '',
      hasFragment: !!fragment,
    },
    passiveRedirects,
    meta: {
      isEncoded: encodedChars.length > 0,
      hasTrailingSlash: url.pathname.endsWith('/') && url.pathname !== '/',
      idn,
      isDataUri,
      encodedCharacters: encodedChars,
    },
  };
}
import { getProxiedUrl, authenticatedFetch, extractTargetUrl } from "./cors"
export async function visitUrl(url: string, settings: AppSettings): Promise<VisitResult> {
  let targetUrl = url.trim();
  if (!targetUrl.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
    targetUrl = 'https://' + targetUrl;
  }

  let currentUrl = targetUrl;
  const redirectChain: string[] = [currentUrl];
  let redirected = false;
  let status = 200;
  let statusText = 'OK';
  let headersList: { key: string; value: string }[] = [];
  let contentType = '';
  let server = '';
  let loopCount = 0;
  const maxHops = 5;

  const startTime = performance.now();

  while (loopCount < maxHops) {
    const proxyUrl = getProxiedUrl(currentUrl, settings.corsProvider, settings.customCorsUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await authenticatedFetch(proxyUrl, {
        method: 'HEAD',
        headers: { 'Accept': '*/*' },
        redirect: 'manual',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      status = res.status;
      statusText = res.statusText;

      headersList = [];
      res.headers.forEach((value, key) => {
        headersList.push({ key, value });
      });

      contentType = res.headers.get('content-type') || contentType;
      server = res.headers.get('server') || server;

      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        redirected = true;
        let nextUrl = location;
        try {
          nextUrl = new URL(location, currentUrl).href;
        } catch { /* ignore */ }

        redirectChain.push(nextUrl);
        currentUrl = nextUrl;
        loopCount++;
      } else if (res.status === 403 || res.status === 405) {
        // Fallback to GET for servers rejecting HEAD
        const proxyUrlGet = getProxiedUrl(currentUrl, settings.corsProvider, settings.customCorsUrl);
        const controllerGet = new AbortController();
        const timeoutIdGet = setTimeout(() => controllerGet.abort(), 8000);
        
        try {
          const resGet = await authenticatedFetch(proxyUrlGet, { method: 'GET', signal: controllerGet.signal });
          clearTimeout(timeoutIdGet);

          status = resGet.status;
          statusText = resGet.statusText;

          headersList = [];
          resGet.headers.forEach((value, key) => {
            headersList.push({ key, value });
          });

          contentType = resGet.headers.get('content-type') || contentType;
          server = resGet.headers.get('server') || server;

          const extractedFinal = extractTargetUrl(resGet.url, settings.corsProvider, settings.customCorsUrl);
          if (extractedFinal !== currentUrl) {
            redirected = true;
            redirectChain.push(extractedFinal);
            currentUrl = extractedFinal;
          }
        } catch (getErr) {
          clearTimeout(timeoutIdGet);
          logger.warn(`Fallback GET failed:`, getErr);
        }
        break;
      } else {
        break;
      }
    } catch {
      clearTimeout(timeoutId);
      const proxyUrlGet = getProxiedUrl(currentUrl, settings.corsProvider, settings.customCorsUrl);
      const controllerGet = new AbortController();
      const timeoutIdGet = setTimeout(() => controllerGet.abort(), 8000);
      
      try {
        const resGet = await authenticatedFetch(proxyUrlGet, { method: 'GET', signal: controllerGet.signal });
        clearTimeout(timeoutIdGet);

        status = resGet.status;
        statusText = resGet.statusText;

        headersList = [];
        resGet.headers.forEach((value, key) => {
          headersList.push({ key, value });
        });

        contentType = resGet.headers.get('content-type') || contentType;
        server = resGet.headers.get('server') || server;

        const extractedFinal = extractTargetUrl(resGet.url, settings.corsProvider, settings.customCorsUrl);
        if (extractedFinal !== currentUrl) {
          redirected = true;
          redirectChain.push(extractedFinal);
          currentUrl = extractedFinal;
        }
      } catch (getErr) {
        clearTimeout(timeoutIdGet);
        logger.warn(`Redirect hop fallback GET failed:`, getErr);
      }
      break;
    }
  }

  const responseTime = Math.round(performance.now() - startTime);

  return {
    status,
    statusText,
    headers: headersList,
    redirected,
    finalUrl: currentUrl,
    responseTime,
    contentType,
    server,
    redirectChain
  };
}
