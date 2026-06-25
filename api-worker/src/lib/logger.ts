const REDACTED = "[redacted]";

function sanitizeString(str: string): string {
  let sanitized = str.replace(/([?&](?:q|name|url|domain|resource|host|quest)=)([^&?#\s]+)/gi, `$1${REDACTED}`);

  sanitized = sanitized.replace(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?/gi, (match) => {
    try {
      const url = new URL(match);
      const knownProviders = [
        'dns.google', 'cloudflare-dns.com', 'dns.alidns.com', 'dns.adguard-dns.com',
        'api.ipapi.is', 'stat.ripe.net', 'www.peeringdb.com', 'api.hackertarget.com',
        'urlscan.io', 'crt.sh', 'api.certspotter.com', 'jldc.me', 'api.mnemonic.no',
        'web.archive.org', 'tls.bufferover.run', 'rdap.org', 'www.macvendorlookup.com',
        'api.allorigins.win', 'api.codetabs.com', 'thingproxy.freeboard.io',
        'cors-anywhere.herokuapp.com', 'corsproxy.io'
      ];

      if (knownProviders.some(p => url.hostname.includes(p))) {
        return `${url.protocol}//${url.hostname}${url.pathname}?${REDACTED}`;
      }
      return `${url.protocol}//${REDACTED}`;
    } catch {
      return `${REDACTED}`;
    }
  });

  return sanitized;
}

function sanitizeData(data: unknown): unknown {
  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  if (data instanceof Error) {
    const sanitizedError = new Error(sanitizeString(data.message));
    if (data.stack) {
      sanitizedError.stack = sanitizeString(data.stack);
    }
    return sanitizedError;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  if (data !== null && typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitized[key] = sanitizeData((data as Record<string, unknown>)[key]);
      }
    }
    return sanitized;
  }

  return data;
}

export const logger = {
  log: (...args: unknown[]) => {
    console.log(...args.map(sanitizeData));
  },
  info: (...args: unknown[]) => {
    console.info(...args.map(sanitizeData));
  },
  warn: (...args: unknown[]) => {
    console.warn(...args.map(sanitizeData));
  },
  error: (...args: unknown[]) => {
    console.error(...args.map(sanitizeData));
  },
  debug: (...args: unknown[]) => {
    console.debug(...args.map(sanitizeData));
  }
};
