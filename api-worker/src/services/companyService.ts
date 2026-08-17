export interface CompanyInfo {
  name: string;
  domain?: string;
  logo?: string;
  symbol?: string;
  exchange?: string;
  type?: string;
}

export async function lookupCompany(query: string): Promise<CompanyInfo[]> {
  const clean = query.trim();
  if (!clean) return [];

  const results: CompanyInfo[] = [];

  // 1. Query Clearbit Autocomplete
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
            type: 'Private / Public Company'
          });
        });
      }
    }
  } catch {
    // ignore
  }

  // 2. Query Yahoo Finance Search
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
            type: q.quoteType || 'Stock / Security'
          });
        });
      }
    }
  } catch {
    // ignore
  }

  return results;
}
