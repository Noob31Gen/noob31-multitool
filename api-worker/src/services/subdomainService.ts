import type { SubdomainResult } from '../types';

export async function enumerateSubdomains(domain: string): Promise<SubdomainResult> {
  const startTime = performance.now();
  const cleanDomain = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
  const subdomainsSet = new Set<string>();
  const sourcesUsed: string[] = [];

  // 1. crt.sh
  const fetchCrtSh = async () => {
    const url = `https://crt.sh/?q=%.${encodeURIComponent(cleanDomain)}&output=json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return;
      const data = await res.json() as { name_value?: string }[];
      if (Array.isArray(data)) {
        sourcesUsed.push('crt.sh');
        data.forEach(entry => {
          if (entry.name_value) {
            entry.name_value.split('\n').forEach(sub => {
              const cleanSub = sub.trim().toLowerCase().replace(/^\*\./, '');
              if (cleanSub.endsWith(`.${cleanDomain}`) || cleanSub === cleanDomain) {
                subdomainsSet.add(cleanSub);
              }
            });
          }
        });
      }
    } catch {
      clearTimeout(timeoutId);
    }
  };

  // 2. CertSpotter
  const fetchCertSpotter = async () => {
    const url = `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(cleanDomain)}&include_subdomains=true&expand=dns_names&limit=100`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return;
      const data = await res.json() as { dns_names?: string[] }[];
      if (Array.isArray(data)) {
        sourcesUsed.push('CertSpotter');
        data.forEach(entry => {
          if (Array.isArray(entry.dns_names)) {
            entry.dns_names.forEach(sub => {
              const cleanSub = sub.trim().toLowerCase().replace(/^\*\./, '');
              if (cleanSub.endsWith(`.${cleanDomain}`) || cleanSub === cleanDomain) {
                subdomainsSet.add(cleanSub);
              }
            });
          }
        });
      }
    } catch {
      clearTimeout(timeoutId);
    }
  };

  // 3. Mnemonic PDNS
  const fetchMnemonic = async () => {
    const url = `https://api.mnemonic.no/pdns/v3/${encodeURIComponent(cleanDomain)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return;
      const data = await res.json() as { data?: { query?: string }[] };
      if (data && Array.isArray(data.data)) {
        sourcesUsed.push('Mnemonic PDNS');
        data.data.forEach(entry => {
          if (entry.query) {
            const cleanSub = entry.query.trim().toLowerCase().replace(/^\*\./, '');
            if (cleanSub.endsWith(`.${cleanDomain}`) || cleanSub === cleanDomain) {
              subdomainsSet.add(cleanSub);
            }
          }
        });
      }
    } catch {
      clearTimeout(timeoutId);
    }
  };

  // 4. RapidDNS (Server-Side Scraper)
  const fetchRapidDns = async () => {
    const url = `https://rapiddns.io/subdomain/${encodeURIComponent(cleanDomain)}?full=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MultiTools-Scanner/1.0)' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) return;
      const text = await res.text();
      const regex = /<td>([a-zA-Z0-9._-]+\.[a-zA-Z0-9.-]+)<\/td>/g;
      let match;
      let matchedCount = 0;
      while ((match = regex.exec(text)) !== null) {
        const sub = match[1].trim().toLowerCase();
        if (sub.endsWith(`.${cleanDomain}`) || sub === cleanDomain) {
          subdomainsSet.add(sub);
          matchedCount++;
        }
      }
      if (matchedCount > 0) {
        sourcesUsed.push('RapidDNS');
      }
    } catch {
      clearTimeout(timeoutId);
    }
  };

  // 5. URLScan.io Crawl History
  const fetchUrlScan = async () => {
    const url = `https://urlscan.io/api/v1/search/?q=domain:${encodeURIComponent(cleanDomain)}&size=100`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return;
      const data = await res.json() as { results?: { page?: { domain?: string } }[] };
      if (data && Array.isArray(data.results)) {
        let found = 0;
        data.results.forEach(r => {
          const dom = r.page?.domain?.trim().toLowerCase();
          if (dom && (dom.endsWith(`.${cleanDomain}`) || dom === cleanDomain)) {
            subdomainsSet.add(dom);
            found++;
          }
        });
        if (found > 0) {
          sourcesUsed.push('URLScan.io');
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }
  };

  // 6. HackerTarget Hostsearch
  const fetchHackerTarget = async () => {
    const url = `https://api.hackertarget.com/hostsearch/?q=${encodeURIComponent(cleanDomain)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MultiTools-Scanner/1.0)' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) return;
      const text = await res.text();
      if (!text.includes('API count exceeded') && !text.includes('error')) {
        const lines = text.split('\n');
        let count = 0;
        lines.forEach(line => {
          const parts = line.split(',');
          const sub = parts[0]?.trim().toLowerCase();
          if (sub && (sub.endsWith(`.${cleanDomain}`) || sub === cleanDomain)) {
            subdomainsSet.add(sub);
            count++;
          }
        });
        if (count > 0) {
          sourcesUsed.push('HackerTarget');
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }
  };

  // 7. crt.name CT Search
  const fetchCrtName = async () => {
    const url = `https://crt.name/v1/search?apex=${encodeURIComponent(cleanDomain)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return;
      const text = await res.text();
      if (text && !text.trim().startsWith('<')) {
        let count = 0;
        text.split('\n').forEach(line => {
          const sub = line.trim().toLowerCase().replace(/^\*\./, '');
          if (sub && (sub.endsWith(`.${cleanDomain}`) || sub === cleanDomain)) {
            subdomainsSet.add(sub);
            count++;
          }
        });
        if (count > 0) {
          sourcesUsed.push('crt.name');
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }
  };

  await Promise.allSettled([
    fetchCrtName(),
    fetchCrtSh(),
    fetchCertSpotter(),
    fetchMnemonic(),
    fetchRapidDns(),
    fetchUrlScan(),
    fetchHackerTarget()
  ]);

  const sortedSubdomains = Array.from(subdomainsSet).sort();

  return {
    domain: cleanDomain,
    subdomains: sortedSubdomains,
    count: sortedSubdomains.length,
    sourcesUsed,
    queryTimeMs: Math.round(performance.now() - startTime)
  };
}
