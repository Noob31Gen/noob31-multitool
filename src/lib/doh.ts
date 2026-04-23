import * as dnsPacket from 'dns-packet';
import { Buffer } from 'buffer';
import type { CorsProvider } from './cors';
import { getProxiedUrl } from './cors';

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
  provider: 'google' | 'cloudflare' | 'alidns' | 'adguard' | 'custom';
}

const TYPE_MAP: Record<number, string> = {
  1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX', 16: 'TXT',
  28: 'AAAA', 29: 'LOC', 33: 'SRV', 43: 'DS', 45: 'IPSECKEY', 46: 'RRSIG',
  47: 'NSEC', 48: 'DNSKEY', 50: 'NSEC3', 51: 'NSEC3PARAM', 255: 'ANY'
};

export function getTypeName(typeCode: number): string {
  return TYPE_MAP[typeCode] || `TYPE${typeCode}`;
}

export async function queryDNS(
  domain: string,
  type: string,
  provider: 'google' | 'cloudflare' | 'alidns' | 'adguard' | 'custom' = 'google',
  customUrl: string = '',
  corsProvider: CorsProvider = 'none',
  customCorsUrl: string = ''
): Promise<DNSResponse> {
  const startTime = performance.now();

  let url = '';
  let headers: HeadersInit = { 'Accept': 'application/dns-json' };
  let body: BodyInit | null = null;
  let method = 'GET';

  if (provider === 'google') {
    url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
  } else if (provider === 'cloudflare') {
    url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
  } else if (provider === 'alidns') {
    url = `https://dns.alidns.com/resolve?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
  } else if (provider === 'adguard') {
    url = `https://dns.adguard-dns.com/resolve?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
  } else if (provider === 'custom') {
    const packet = dnsPacket.encode({
      type: 'query',
      id: 1,
      flags: dnsPacket.RECURSION_DESIRED,
      questions: [{ type: type as any, name: domain }]
    });

    const base64 = btoa(Array.from(packet).map(b => String.fromCharCode(b)).join(''));
    const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const targetUrl = customUrl.includes('?')
      ? `${customUrl}&dns=${base64Url}`
      : `${customUrl}?dns=${base64Url}`;

    url = getProxiedUrl(targetUrl, corsProvider, customCorsUrl);
    method = 'GET';
    headers = { 'Accept': 'application/dns-message' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { method, headers, body, signal: controller.signal });
    clearTimeout(timeoutId);;

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    let data: any;

    if (contentType.includes('application/dns-json') || contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const arrayBuffer = await response.arrayBuffer();
      const bufferObj = typeof Buffer !== 'undefined' ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer);
      const decoded = dnsPacket.decode(bufferObj as any) as any;

      const REVERSE_TYPE_MAP: Record<string, number> = Object.entries(TYPE_MAP).reduce((acc, [k, v]) => {
        acc[v] = parseInt(k, 10);
        return acc;
      }, {} as Record<string, number>);

      data = {
        Status: decoded.rcode === 'NOERROR' ? 0 : -1,
        Answer: decoded.answers?.map((a: any) => ({
          name: a.name,
          type: REVERSE_TYPE_MAP[a.type as string] || 0,
          TTL: a.ttl,
          data: a.data
        })) || [],
        Authority: decoded.authorities?.map((a: any) => ({
          name: a.name,
          type: REVERSE_TYPE_MAP[a.type as string] || 0,
          TTL: a.ttl,
          data: a.data
        })) || []
      };
    }

    const queryTime = Math.round(performance.now() - startTime);

    const mapRecords = (records: any[] = []): DNSRecord[] => {
      return records.map((r: any) => ({
        name: r.name,
        type: r.type,
        typeName: typeof getTypeName === 'function' ? getTypeName(r.type) : `TYPE${r.type}`,
        TTL: r.TTL,
        data: typeof r.data === 'string' ? r.data : JSON.stringify(r.data),
      }));
    };

    return {
      status: data.Status ?? -1,
      records: mapRecords(data.Answer),
      authority: mapRecords(data.Authority),
      queryTime,
      provider,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[DoH] Fetch Error:`, error);
    throw error;
  }
}