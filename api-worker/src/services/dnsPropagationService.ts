export interface ResolverResult {
  provider: string;
  location: string;
  status: 'ok' | 'error';
  latencyMs: number;
  records: string[];
  ttl?: number;
  error?: string;
}

export interface DnsPropagationResult {
  domain: string;
  type: string;
  totalResolvers: number;
  successfulResolvers: number;
  consensusPercentage: number;
  resolvers: ResolverResult[];
  queryTimeMs: number;
}

const GLOBAL_RESOLVERS = [
  {
    name: 'Google Public DNS',
    location: 'North America / Anycast',
    url: (d: string, t: string) => `https://dns.google/resolve?name=${encodeURIComponent(d)}&type=${encodeURIComponent(t)}`
  },
  {
    name: 'Cloudflare DNS',
    location: 'Global Anycast',
    url: (d: string, t: string) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(d)}&type=${encodeURIComponent(t)}`
  },
  {
    name: 'AliDNS',
    location: 'Asia-Pacific',
    url: (d: string, t: string) => `https://dns.alidns.com/resolve?name=${encodeURIComponent(d)}&type=${encodeURIComponent(t)}`
  },
  {
    name: 'AdGuard DNS',
    location: 'Europe / Anycast',
    url: (d: string, t: string) => `https://dns.adguard-dns.com/resolve?name=${encodeURIComponent(d)}&type=${encodeURIComponent(t)}`
  },
  {
    name: 'DNS.SB',
    location: 'Global Anycast',
    url: (d: string, t: string) => `https://doh.dns.sb/dns-query?name=${encodeURIComponent(d)}&type=${encodeURIComponent(t)}`
  }
];

export async function checkDnsPropagation(domain: string, type: string = 'A'): Promise<DnsPropagationResult> {
  const startTime = performance.now();
  const cleanDomain = domain.trim().toLowerCase();
  const cleanType = type.trim().toUpperCase();

  const results: ResolverResult[] = await Promise.all(
    GLOBAL_RESOLVERS.map(async (res) => {
      const resolverStart = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const fetchRes = await fetch(res.url(cleanDomain, cleanType), {
          headers: { 'Accept': 'application/dns-json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const latencyMs = Math.round(performance.now() - resolverStart);

        if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);
        const data = await fetchRes.json() as {
          Answer?: { data: string; TTL?: number }[];
        };

        const records = (data.Answer || []).map(a => a.data);
        const ttl = data.Answer?.[0]?.TTL;

        return {
          provider: res.name,
          location: res.location,
          status: 'ok',
          latencyMs,
          records,
          ttl
        };
      } catch (err) {
        clearTimeout(timeoutId);
        return {
          provider: res.name,
          location: res.location,
          status: 'error',
          latencyMs: Math.round(performance.now() - resolverStart),
          records: [],
          error: err instanceof Error ? err.message : String(err)
        };
      }
    })
  );

  const successful = results.filter(r => r.status === 'ok');

  // Calculate consensus
  let consensusPercentage = 0;
  if (successful.length > 0) {
    const recordSets = successful.map(r => [...r.records].sort().join(','));
    const frequencyMap = new Map<string, number>();
    recordSets.forEach(s => frequencyMap.set(s, (frequencyMap.get(s) || 0) + 1));
    const highestFreq = Math.max(...Array.from(frequencyMap.values()));
    consensusPercentage = Math.round((highestFreq / successful.length) * 100);
  }

  return {
    domain: cleanDomain,
    type: cleanType,
    totalResolvers: results.length,
    successfulResolvers: successful.length,
    consensusPercentage,
    resolvers: results,
    queryTimeMs: Math.round(performance.now() - startTime)
  };
}
