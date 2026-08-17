import type { DnsRecord, DnsLookupResult, ReverseDnsResult } from '../types';

const TYPE_MAP: Record<number, string> = {
  1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX', 16: 'TXT',
  28: 'AAAA', 29: 'LOC', 33: 'SRV', 43: 'DS', 45: 'IPSECKEY', 46: 'RRSIG',
  47: 'NSEC', 48: 'DNSKEY', 50: 'NSEC3', 51: 'NSEC3PARAM', 257: 'CAA', 255: 'ANY'
};

const REVERSE_TYPE_MAP: Record<string, number> = Object.entries(TYPE_MAP).reduce((acc, [k, v]) => {
  acc[v] = parseInt(k, 10);
  return acc;
}, {} as Record<string, number>);

export function getTypeName(typeCode: number): string {
  return TYPE_MAP[typeCode] || `TYPE${typeCode}`;
}

export function getTypeCode(typeName: string): number {
  return REVERSE_TYPE_MAP[typeName.toUpperCase()] || 1;
}

interface RawDnsAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface RawDnsResponse {
  Status: number;
  TC?: boolean;
  RD?: boolean;
  RA?: boolean;
  AD?: boolean;
  CD?: boolean;
  Question?: { name: string; type: number }[];
  Answer?: RawDnsAnswer[];
  Authority?: RawDnsAnswer[];
  Comment?: string;
}

async function fetchDohEndpoint(url: string, timeoutMs: number = 4000): Promise<RawDnsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/dns-json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`DoH endpoint returned HTTP ${res.status}`);
    }
    return await res.json() as RawDnsResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function lookupDns(
  domain: string,
  type: string = 'A',
  provider: string = 'auto'
): Promise<DnsLookupResult> {
  const startTime = performance.now();
  const cleanDomain = domain.trim().toLowerCase();
  const cleanType = type.trim().toUpperCase();

  const providerUrls: Record<string, string> = {
    google: `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=${encodeURIComponent(cleanType)}`,
    cloudflare: `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=${encodeURIComponent(cleanType)}`,
    alidns: `https://dns.alidns.com/resolve?name=${encodeURIComponent(cleanDomain)}&type=${encodeURIComponent(cleanType)}`,
    adguard: `https://dns.adguard-dns.com/resolve?name=${encodeURIComponent(cleanDomain)}&type=${encodeURIComponent(cleanType)}`
  };

  const pool = provider === 'auto' ? ['google', 'cloudflare', 'alidns'] : [provider];
  let lastError: Error | null = null;

  for (const prov of pool) {
    const targetUrl = providerUrls[prov] || `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=${encodeURIComponent(cleanType)}`;
    try {
      const data = await fetchDohEndpoint(targetUrl);
      const queryTimeMs = Math.round(performance.now() - startTime);

      const records: DnsRecord[] = (data.Answer || []).map((ans) => ({
        name: ans.name,
        type: ans.type,
        typeName: getTypeName(ans.type),
        TTL: ans.TTL,
        data: ans.data
      }));

      const authority: DnsRecord[] = (data.Authority || []).map((auth) => ({
        name: auth.name,
        type: auth.type,
        typeName: getTypeName(auth.type),
        TTL: auth.TTL,
        data: auth.data
      }));

      return {
        domain: cleanDomain,
        type: cleanType,
        status: data.Status,
        records,
        authority: authority.length > 0 ? authority : undefined,
        provider: prov,
        queryTimeMs
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error(`All DNS resolvers failed for ${cleanDomain} (${cleanType})`);
}

export function formatIpToPtr(ip: string): string {
  const clean = ip.trim();
  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(clean)) {
    return clean.split('.').reverse().join('.') + '.in-addr.arpa';
  }
  // IPv6
  if (clean.includes(':')) {
    // Expand IPv6
    const parts = clean.split('::');
    let fullHex = '';
    if (parts.length === 2) {
      const left = parts[0] ? parts[0].split(':') : [];
      const right = parts[1] ? parts[1].split(':') : [];
      const missing = 8 - (left.length + right.length);
      const zeros = Array(missing).fill('0000');
      const allParts = [...left, ...zeros, ...right].map(p => p.padStart(4, '0'));
      fullHex = allParts.join('');
    } else {
      fullHex = clean.split(':').map(p => p.padStart(4, '0')).join('');
    }
    return fullHex.split('').reverse().join('.') + '.ip6.arpa';
  }
  return clean;
}

export async function lookupReverseDns(ip: string): Promise<ReverseDnsResult> {
  const startTime = performance.now();
  const ptrDomain = formatIpToPtr(ip);
  const result = await lookupDns(ptrDomain, 'PTR', 'auto');
  const ptrRecords = result.records
    .filter(r => r.typeName === 'PTR')
    .map(r => r.data.replace(/\.$/, ''));

  return {
    ip,
    ptr: ptrRecords,
    queryTimeMs: Math.round(performance.now() - startTime)
  };
}
