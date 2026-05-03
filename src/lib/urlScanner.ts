import type { AppSettings } from "./settings"

// ---- Parsed URL Structures ----

export interface UrlComponent {
  label: string;
  value: string;
  raw?: string;       // original encoded value if decoded
  highlight?: string; // color hint for the visual breakdown
}

export interface ParsedUrl {
  // Raw input
  original: string;
  normalized: string;
  length: number;

  // Scheme
  scheme: {
    value: string;
    isSecure: boolean;
    defaultPort: string;
  };

  // Authority (userinfo + host + port)
  authority: {
    full: string;
    userinfo: {
      username: string;
      password: string;
      hasCredentials: boolean;
    };
    host: {
      full: string;           // host:port
      hostname: string;       // just hostname
      isIp: boolean;
      isIpv6: boolean;
      isLocalhost: boolean;
      registeredDomain: string; // sld.tld
      tld: string;
      sld: string;
      subdomain: string;
      labels: string[];       // all domain labels
    };
    port: {
      value: string;
      isDefault: boolean;
      number: number | null;
    };
  };

  // Path
  path: {
    full: string;
    segments: string[];
    depth: number;
    filename: string;
    fileExtension: string;
    directoryPath: string;
    isDirectory: boolean;  // ends with /
  };

  // Query
  query: {
    full: string;
    params: { key: string; value: string; decoded: string }[];
    count: number;
  };

  // Fragment
  fragment: {
    value: string;
    decoded: string;
    hasFragment: boolean;
  };

  // Metadata
  meta: {
    isEncoded: boolean;
    hasTrailingSlash: boolean;
    idn: boolean;           // internationalized domain name
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
}

// ---- Default ports ----
const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443',
  'ftp:': '21',
  'ftps:': '990',
  'ssh:': '22',
  'ws:': '80',
  'wss:': '443',
};

// ---- Parse function ----

export function parseUrl(input: string): ParsedUrl {
  let urlToParse = input.trim();
  const isDataUri = urlToParse.toLowerCase().startsWith('data:');

  // Normalize: add scheme if missing
  if (!isDataUri && !urlToParse.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
    urlToParse = 'https://' + urlToParse;
  }

  const url = new URL(urlToParse);

  // --- Scheme ---
  const scheme = {
    value: url.protocol.replace(':', ''),
    isSecure: url.protocol === 'https:' || url.protocol === 'wss:' || url.protocol === 'ftps:',
    defaultPort: DEFAULT_PORTS[url.protocol] || '',
  };

  // --- Host breakdown ---
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

    // Handle multi-part TLDs like co.uk, com.au
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

  // --- Port ---
  const portValue = url.port;
  const isDefaultPort = !portValue || portValue === DEFAULT_PORTS[url.protocol];

  // --- Path ---
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

  // --- Query ---
  const params: { key: string; value: string; decoded: string }[] = [];
  url.searchParams.forEach((value, key) => {
    params.push({
      key,
      value,
      decoded: decodeURIComponent(value),
    });
  });

  // --- Fragment ---
  const fragment = url.hash.replace('#', '');

  // --- Encoded characters detection ---
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
    } catch { /* ignore invalid sequences */ }
  }

  // --- IDN detection ---
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

    meta: {
      isEncoded: encodedChars.length > 0,
      hasTrailingSlash: url.pathname.endsWith('/') && url.pathname !== '/',
      idn,
      isDataUri,
      encodedCharacters: encodedChars,
    },
  };
}

import { getProxiedUrl, authenticatedFetch } from "./cors"

// ---- Visit function ----

export async function visitUrl(url: string, settings: AppSettings): Promise<VisitResult> {
  let targetUrl = url.trim();
  if (!targetUrl.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
    targetUrl = 'https://' + targetUrl;
  }

  const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const startTime = performance.now();

  try {
    let res = await authenticatedFetch(proxyUrl, { method: 'HEAD', signal: controller.signal });
    if (res.status === 405) {
      res = await authenticatedFetch(proxyUrl, { method: 'GET', signal: controller.signal });
    }
    clearTimeout(timeoutId);
    const responseTime = Math.round(performance.now() - startTime);

    const headers: { key: string; value: string }[] = [];
    res.headers.forEach((value, key) => {
      headers.push({ key, value });
    });

    return {
      status: res.status,
      statusText: res.statusText,
      headers,
      redirected: res.redirected,
      finalUrl: res.url,
      responseTime,
      contentType: res.headers.get('content-type') || '',
      server: res.headers.get('server') || '',
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}
