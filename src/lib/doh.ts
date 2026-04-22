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
  provider: 'google' | 'cloudflare';
}

const TYPE_MAP: Record<number, string> = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  6: 'SOA',
  12: 'PTR',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
  29: 'LOC',
  33: 'SRV',
  43: 'DS',
  45: 'IPSECKEY',
  46: 'RRSIG',
  47: 'NSEC',
  48: 'DNSKEY',
  50: 'NSEC3',
  51: 'NSEC3PARAM',
  255: 'ANY'
};

export function getTypeName(typeCode: number): string {
  return TYPE_MAP[typeCode] || `TYPE${typeCode}`;
}

export async function queryDNS(
  domain: string,
  type: string,
  provider: 'google' | 'cloudflare' = 'google'
): Promise<DNSResponse> {
  const startTime = performance.now();
  
  let url = '';
  let headers: HeadersInit = {};

  if (provider === 'google') {
    url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
  } else {
    url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
    headers = { 'accept': 'application/dns-json' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const queryTime = Math.round(performance.now() - startTime);

    const mapRecords = (records: any[] = []): DNSRecord[] => {
      return records.map((r: any) => ({
        name: r.name,
        type: r.type,
        typeName: getTypeName(r.type),
        TTL: r.TTL,
        data: r.data,
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
    throw error;
  }
}
