export interface CompanyInfo {
  name: string;
  domain?: string;
  logo?: string;
  symbol?: string;
  exchange?: string;
  cik?: string;
  type?: string;
  source?: string;
}

export async function lookupCompany(query: string): Promise<CompanyInfo[]> {
  const clean = query.trim();
  if (!clean) return [];

  const results: CompanyInfo[] = [];

  // 1. SEC Official Company Tickers & CIK Database
  const fetchSec = async () => {
    try {
      const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': 'Noob31MultiTools admin@noob31.com' },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json() as Record<string, { cik_str?: number; ticker?: string; title?: string }>;
        const cleanLower = clean.toLowerCase();
        let matches = 0;
        for (const key in data) {
          const item = data[key];
          if (!item) continue;
          const ticker = (item.ticker || '').toLowerCase();
          const title = (item.title || '').toLowerCase();
          if (ticker === cleanLower || title.includes(cleanLower) || cleanLower.includes(ticker)) {
            results.push({
              name: item.title || 'Unknown',
              symbol: item.ticker,
              cik: item.cik_str ? String(item.cik_str).padStart(10, '0') : undefined,
              type: 'SEC Registered Public Entity',
              source: 'U.S. Securities and Exchange Commission (SEC EDGAR)'
            });
            matches++;
            if (matches >= 10) break;
          }
        }
      }
    } catch {
      // ignore
    }
  };

  // 2. Query Clearbit Autocomplete
  const fetchClearbit = async () => {
    try {
      const clearbitUrl = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(clean)}`;
      const res = await fetch(clearbitUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json() as { name: string; domain: string; logo: string }[];
        if (Array.isArray(data)) {
          data.forEach(item => {
            results.push({
              name: item.name,
              domain: item.domain,
              logo: item.logo,
              type: 'Private / Commercial Brand',
              source: 'Clearbit'
            });
          });
        }
      }
    } catch {
      // ignore
    }
  };

  // 3. Query Yahoo Finance Search
  const fetchYahoo = async () => {
    try {
      const yfUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(clean)}`;
      const res = await fetch(yfUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json() as {
          quotes?: {
            symbol?: string;
            shortname?: string;
            longname?: string;
            exchange?: string;
            quoteType?: string;
          }[];
        };
        if (data && Array.isArray(data.quotes)) {
          data.quotes.forEach(q => {
            results.push({
              name: q.longname || q.shortname || q.symbol || 'Unknown',
              symbol: q.symbol,
              exchange: q.exchange,
              type: q.quoteType || 'Stock / Equity',
              source: 'Yahoo Finance'
            });
          });
        }
      }
    } catch {
      // ignore
    }
  };

  await Promise.allSettled([
    fetchSec(),
    fetchClearbit(),
    fetchYahoo()
  ]);

  // Deduplicate by symbol or name
  const seen = new Set<string>();
  const uniqueResults: CompanyInfo[] = [];
  results.forEach(r => {
    const key = (r.symbol || r.domain || r.name).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(r);
    }
  });

  return uniqueResults;
}
