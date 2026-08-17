import type { CveDetail } from '../types';

export async function lookupCve(cveId: string): Promise<CveDetail> {
  const cleanId = cveId.trim().toUpperCase();

  // 1. Try CIRCL CVE-Search
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
    // try OSV
  }

  // 2. Try OSV API
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

  throw new Error(`Vulnerability details not found for ${cleanId}`);
}
