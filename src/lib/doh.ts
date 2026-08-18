import * as dnsPacket from 'dns-packet';
import { logger } from './logger';
import { Buffer } from 'buffer';
import type { CorsProvider } from './cors';
import { getProxiedUrl, authenticatedFetch } from './cors';
import type { AppSettings } from './settings';
import { isCustomServerEnabled, queryDnsServer } from './apiServer';
import { safeStorage } from './storage';

// Polyfill Buffer on window for browser-compatibility with dns-packet
if (typeof window !== 'undefined' && !(window as { Buffer?: typeof Buffer }).Buffer) {
  (window as { Buffer?: typeof Buffer }).Buffer = Buffer;
}

export interface DNSRecord {
  name: string;
  type: number;
  typeName: string;
  TTL: number;
  data: string;
}

export interface DNSResponse {
  status: number;
  records: DNSRecord[];
  authority?: DNSRecord[];
  queryTime: number;
  provider: 'auto' | 'google' | 'cloudflare' | 'alidns' | 'adguard' | 'quad9' | 'opendns' | 'custom' | string;
}

const TYPE_MAP: Record<number, string> = {
  1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX', 16: 'TXT',
  28: 'AAAA', 29: 'LOC', 33: 'SRV', 43: 'DS', 45: 'IPSECKEY', 46: 'RRSIG',
  47: 'NSEC', 48: 'DNSKEY', 50: 'NSEC3', 51: 'NSEC3PARAM', 255: 'ANY'
};

export function getTypeName(typeCode: number): string {
  return TYPE_MAP[typeCode] || `TYPE${typeCode}`;
}

interface CacheEntry {
  response: DNSResponse;
  expiry: number;
}

const dnsCache = new Map<string, CacheEntry>();

function getMinTtl(response: DNSResponse): number {
  let minTtl = 60; // Minimum default TTL (60 seconds)
  const allRecords = [...response.records, ...(response.authority || [])];
  if (allRecords.length > 0) {
    const ttls = allRecords.map(r => r.TTL).filter(t => typeof t === 'number' && t > 0);
    if (ttls.length > 0) {
      minTtl = Math.max(10, Math.min(...ttls)); // Clamp between 10s and minimum TTL
    }
  }
  return Math.min(minTtl, 600); // Cap cache duration at 10 minutes to prevent overly stale results
}

function formatDnsData(type: string, data: unknown): string {
  if (data === null || data === undefined) return '';
  if (typeof data === 'string') return data;
  
  if (data instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(data))) {
    return new TextDecoder().decode(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => formatDnsData(type, item)).join('');
  }

  if (typeof data === 'object') {
    const record = data as {
      preference?: number;
      priority?: number;
      exchange?: string;
      mname?: string;
      rname?: string;
      serial?: number;
      refresh?: number;
      retry?: number;
      expire?: number;
      minimum?: number;
      weight?: number;
      port?: number;
      target?: string;
    };
    if (type === 'MX') {
      const pref = record.preference !== undefined ? record.preference : (record.priority !== undefined ? record.priority : 0);
      const exchange = record.exchange || '';
      return `${pref} ${exchange}`;
    }
    if (type === 'SOA') {
      return `${record.mname || ''} ${record.rname || ''} ${record.serial ?? 0} ${record.refresh ?? 0} ${record.retry ?? 0} ${record.expire ?? 0} ${record.minimum ?? 0}`;
    }
    if (type === 'SRV') {
      return `${record.priority ?? 0} ${record.weight ?? 0} ${record.port ?? 0} ${record.target || ''}`;
    }
    return JSON.stringify(data);
  }

  return String(data);
}

async function executeSingleQuery(
  domain: string,
  type: string,
  provider: 'google' | 'cloudflare' | 'alidns' | 'adguard' | 'quad9' | 'opendns' | 'custom',
  customUrl: string = '',
  corsProvider: CorsProvider = 'none',
  customCorsUrl: string = '',
  startTime: number = performance.now()
): Promise<DNSResponse> {
  let url = '';
  let headers: HeadersInit = { 'Accept': 'application/dns-json' };
  const body: BodyInit | null = null;
  const method = 'GET';

  if (provider === 'google') {
    url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
  } else if (provider === 'cloudflare') {
    url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
  } else if (provider === 'alidns') {
    url = `https://dns.alidns.com/resolve?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
  } else if (provider === 'adguard') {
    const packet = dnsPacket.encode({
      type: 'query',
      id: 1,
      flags: dnsPacket.RECURSION_DESIRED,
      questions: [{ type: type as dnsPacket.RecordType, name: domain }]
    });
    const base64 = btoa(Array.from(packet).map(b => String.fromCharCode(b)).join(''));
    const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    url = `https://dns.adguard-dns.com/dns-query?dns=${base64Url}`;
    headers = { 'Accept': 'application/dns-message' };
  } else if (provider === 'quad9') {
    const packet = dnsPacket.encode({
      type: 'query',
      id: 1,
      flags: dnsPacket.RECURSION_DESIRED,
      questions: [{ type: type as dnsPacket.RecordType, name: domain }]
    });
    const base64 = btoa(Array.from(packet).map(b => String.fromCharCode(b)).join(''));
    const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    url = `https://dns.quad9.net/dns-query?dns=${base64Url}`;
    headers = { 'Accept': 'application/dns-message' };
  } else if (provider === 'opendns') {
    const packet = dnsPacket.encode({
      type: 'query',
      id: 1,
      flags: dnsPacket.RECURSION_DESIRED,
      questions: [{ type: type as dnsPacket.RecordType, name: domain }]
    });
    const base64 = btoa(Array.from(packet).map(b => String.fromCharCode(b)).join(''));
    const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    url = `https://doh.opendns.com/dns-query?dns=${base64Url}`;
    headers = { 'Accept': 'application/dns-message' };
  } else if (provider === 'custom') {
    const isJson = customUrl.includes('/resolve');
    if (isJson) {
      url = customUrl.includes('?')
        ? `${customUrl}&name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`
        : `${customUrl}?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
      headers = { 'Accept': 'application/dns-json' };
    } else {
      const packet = dnsPacket.encode({
        type: 'query',
        id: 1,
        flags: dnsPacket.RECURSION_DESIRED,
        questions: [{ type: type as dnsPacket.RecordType, name: domain }]
      });
      const base64 = btoa(Array.from(packet).map(b => String.fromCharCode(b)).join(''));
      const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      url = customUrl.includes('?')
        ? `${customUrl}&dns=${base64Url}`
        : `${customUrl}?dns=${base64Url}`;
      headers = { 'Accept': 'application/dns-message' };
    }
  }

  const proxiedUrl = getProxiedUrl(url, corsProvider, customCorsUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await authenticatedFetch(proxiedUrl, { method, headers, body, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || '';
    let data: { Status?: number; Answer?: unknown[]; Authority?: unknown[] };
    if (contentType.includes('application/dns-json') || contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const arrayBuffer = await response.arrayBuffer();
      const bufferObj = typeof Buffer !== 'undefined' ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer);
      const decoded = dnsPacket.decode(bufferObj as Buffer) as dnsPacket.Packet;
      const REVERSE_TYPE_MAP: Record<string, number> = Object.entries(TYPE_MAP).reduce((acc, [k, v]) => {
        acc[v] = parseInt(k, 10);
        return acc;
      }, {} as Record<string, number>);
      data = {
        Status: (decoded as { rcode?: string }).rcode === 'NOERROR' ? 0 : -1,
        Answer: (decoded.answers || []).map((a: { name?: string; type?: string | number; ttl?: number; data?: unknown }) => ({
          name: a.name || '',
          type: typeof a.type === 'string' ? (REVERSE_TYPE_MAP[a.type] || 0) : (Number(a.type) || 0),
          TTL: a.ttl || 0,
          data: a.data
        })),
        Authority: (decoded.authorities || []).map((a: { name?: string; type?: string | number; ttl?: number; data?: unknown }) => ({
          name: a.name || '',
          type: typeof a.type === 'string' ? (REVERSE_TYPE_MAP[a.type] || 0) : (Number(a.type) || 0),
          TTL: a.ttl || 0,
          data: a.data
        })),
      };
    }

    const queryTime = Math.round(performance.now() - startTime);
    const mapRecords = (records: { name: string; type: number; TTL: number; data: unknown }[] = []): DNSRecord[] => {
      return records.map((r: { name: string; type: number; TTL: number; data: unknown }) => {
        const typeName = typeof getTypeName === 'function' ? getTypeName(r.type) : `TYPE${r.type}`;
        return {
          name: r.name,
          type: r.type,
          typeName,
          TTL: r.TTL,
          data: formatDnsData(typeName, r.data)
        };
      });
    };

    return {
      status: data.Status ?? -1,
      records: mapRecords(data.Answer as DNSRecord[]),
      authority: mapRecords(data.Authority as DNSRecord[]),
      queryTime,
      provider,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function queryDNS(
  domain: string,
  type: string,
  provider: 'auto' | 'google' | 'cloudflare' | 'alidns' | 'adguard' | 'quad9' | 'opendns' | 'custom' = 'auto',
  customUrl: string = '',
  corsProvider: CorsProvider = 'none',
  customCorsUrl: string = '',
  settings?: AppSettings
): Promise<DNSResponse> {
  // Check explicit settings or storage fallback for custom API server resolution
  let activeSettings = settings;
  if (!activeSettings) {
    try {
      const saved = safeStorage.getItem('url-scanner-settings');
      if (saved) {
        activeSettings = JSON.parse(saved);
      }
    } catch { /* ignore */ }
  }

  if (activeSettings && isCustomServerEnabled(activeSettings)) {
    return queryDnsServer(domain, type, provider, activeSettings);
  }

  if (provider === 'custom' && !customUrl.trim()) {
    throw new Error("Custom DNS URL is not configured in settings. Please open Settings and enter a valid URL.");
  }
  const cacheKey = `${domain.toLowerCase()}_${type.toUpperCase()}_${provider}_${customUrl}_${corsProvider}`;
  const now = Date.now();
  const cached = dnsCache.get(cacheKey);
  
  if (cached && cached.expiry > now) {
    return cached.response;
  }

  const startTime = performance.now();

  if (provider === 'auto') {
    const fallbackPool: ('google' | 'cloudflare' | 'adguard' | 'alidns' | 'quad9' | 'opendns')[] = [
      'google',
      'cloudflare',
      'adguard',
      'alidns',
      'quad9',
      'opendns'
    ];
    let lastError: Error | null = null;
    for (const p of fallbackPool) {
      try {
        const res = await executeSingleQuery(domain, type, p, '', corsProvider, customCorsUrl, startTime);
        const minTtl = getMinTtl(res);
        dnsCache.set(cacheKey, {
          response: res,
          expiry: now + minTtl * 1000
        });
        return res;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn(`DoH Provider '${p}' failed for query '${domain} (${type})':`, err);
      }
    }
    throw lastError || new Error(`All DoH providers failed in Auto fallback pool.`);
  } else {
    try {
      const res = await executeSingleQuery(domain, type, provider, customUrl, corsProvider, customCorsUrl, startTime);
      const minTtl = getMinTtl(res);
      dnsCache.set(cacheKey, {
        response: res,
        expiry: now + minTtl * 1000
      });
      return res;
    } catch (err: unknown) {
      logger.error(`[DoH] Fetch Error for provider '${provider}':`, err);
      throw err;
    }
  }
}