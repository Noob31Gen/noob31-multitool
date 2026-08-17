import type { SubdomainResult } from '../types';

export async function enumerateSubdomains(domain: string): Promise<SubdomainResult> {
  const startTime = performance.now();
  const cleanDomain = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
  const subdomainsSet = new Set<string>();
  const sourcesUsed: string[] = [];

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

  await Promise.allSettled([
    fetchCrtSh(),
    fetchCertSpotter(),
    fetchMnemonic()
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
