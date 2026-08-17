import type { CveDetail } from '../types';

interface BaseCveDetail {
  id: string;
  summary?: string;
  cvss?: number;
  cvssVector?: string;
  published?: string;
  modified?: string;
  references?: string[];
  vulnerableProducts?: string[];
}

export async function lookupCve(cveId: string): Promise<CveDetail> {
  const cleanId = cveId.trim().toUpperCase();

  // 1. Fetch EPSS Data (First.org)
  const fetchEpss = async (): Promise<{ score: number; percentile: number } | undefined> => {
    try {
      const res = await fetch(`https://api.first.org/data/v1/epss?cve=${encodeURIComponent(cleanId)}`, {
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json() as {
          data?: { cve?: string; epss?: string; percentile?: string }[];
        };
        if (data.data && data.data.length > 0) {
          const item = data.data[0];
          return {
            score: parseFloat(item.epss || '0'),
            percentile: parseFloat(item.percentile || '0')
          };
        }
      }
    } catch {
      // ignore
    }
    return undefined;
  };

  // 2. Fetch CIRCL CVE-Search
  const fetchCircl = async (): Promise<BaseCveDetail | null> => {
    try {
      const circlUrl = `https://cve.circl.lu/api/cve/${encodeURIComponent(cleanId)}`;
      const res = await fetch(circlUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json() as {
          id?: string;
          summary?: string;
          cvss?: number;
          cvss3?: number;
          cvss_vector?: string;
          Published?: string;
          Modified?: string;
          references?: string[];
          vulnerable_product?: string[];
        };
        if (data && (data.id || data.summary)) {
          return {
            id: data.id || cleanId,
            summary: data.summary,
            cvss: data.cvss3 ?? data.cvss,
            cvssVector: data.cvss_vector,
            published: data.Published ? new Date(data.Published).toLocaleDateString() : undefined,
            modified: data.Modified ? new Date(data.Modified).toLocaleDateString() : undefined,
            references: Array.isArray(data.references) ? data.references.slice(0, 10) : [],
            vulnerableProducts: Array.isArray(data.vulnerable_product) ? data.vulnerable_product.slice(0, 10) : []
          };
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  // 3. Fetch OSV API Fallback
  const fetchOsv = async (): Promise<BaseCveDetail | null> => {
    try {
      const osvUrl = `https://api.osv.dev/v1/vulns/${encodeURIComponent(cleanId)}`;
      const res = await fetch(osvUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json() as {
          id?: string;
          summary?: string;
          details?: string;
          published?: string;
          modified?: string;
          references?: { type: string; url: string }[];
        };
        if (data && data.id) {
          return {
            id: data.id,
            summary: data.summary || data.details,
            published: data.published ? new Date(data.published).toLocaleDateString() : undefined,
            modified: data.modified ? new Date(data.modified).toLocaleDateString() : undefined,
            references: Array.isArray(data.references) ? data.references.map(r => r.url).slice(0, 10) : []
          };
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  // 4. Check CISA Known Exploited Vulnerabilities (KEV) Feed
  const fetchCisaKev = async () => {
    try {
      const res = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json() as {
          vulnerabilities?: {
            cveID?: string;
            vendorProject?: string;
            product?: string;
            vulnerabilityName?: string;
            dateAdded?: string;
            shortDescription?: string;
            requiredAction?: string;
            dueDate?: string;
          }[];
        };
        if (Array.isArray(data.vulnerabilities)) {
          const matched = data.vulnerabilities.find(v => v.cveID?.toUpperCase() === cleanId);
          if (matched) {
            return {
              vendorProject: matched.vendorProject,
              product: matched.product,
              vulnerabilityName: matched.vulnerabilityName,
              dateAdded: matched.dateAdded,
              shortDescription: matched.shortDescription,
              requiredAction: matched.requiredAction,
              dueDate: matched.dueDate
            };
          }
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  const [epssResult, circlResult, osvResult, cisaKevResult] = await Promise.allSettled([
    fetchEpss(),
    fetchCircl(),
    fetchOsv(),
    fetchCisaKev()
  ]);

  const circlVal = circlResult.status === 'fulfilled' ? circlResult.value : null;
  const osvVal = osvResult.status === 'fulfilled' ? osvResult.value : null;
  const baseDetail: BaseCveDetail | null = circlVal || osvVal;

  const cisaKevVal = cisaKevResult.status === 'fulfilled' ? cisaKevResult.value : null;

  if (!baseDetail && !cisaKevVal) {
    throw new Error(`Vulnerability details not found for ${cleanId}`);
  }

  const epss = epssResult.status === 'fulfilled' ? epssResult.value : undefined;
  const cisaKev = cisaKevVal || undefined;

  return {
    id: cleanId,
    summary: baseDetail?.summary || cisaKev?.shortDescription,
    cvss: baseDetail?.cvss,
    cvssVector: baseDetail?.cvssVector,
    published: baseDetail?.published || cisaKev?.dateAdded,
    modified: baseDetail?.modified,
    references: baseDetail?.references,
    vulnerableProducts: baseDetail?.vulnerableProducts,
    epss,
    isKnownExploited: !!cisaKev,
    cisaKev
  };
}
