import { logger } from "./logger";
import { type AppSettings } from "./settings";
import { getProxiedUrl, authenticatedFetch } from "./cors";
import { isCustomServerEnabled, queryCveServer } from "./apiServer";

export interface CveData {
  cve_id: string;
  summary: string;
  cvss: number | null;
  cvss_version: number | null;
  cvss_v2: number | null;
  cvss_v3: number | null;
  cvss_v4: number | null;
  epss: number | null;
  ranking_epss: number | null;
  kev: boolean;
  propose_action: string | null;
  ransomware_campaign: string | null;
  references: string[];
  vendor: string | null;
  product: string | null;
  version: string | null;
  published_time: string | null;
  cpes?: string[];
}

export async function queryCveDb(cveId: string, settings: AppSettings): Promise<CveData | null> {
  try {
    if (isCustomServerEnabled(settings)) {
      const serverCve = (await queryCveServer(cveId, settings)) as {
        id: string;
        summary?: string;
        cvss?: number;
        references?: string[];
        vulnerableProducts?: string[];
        epss?: { score?: number; percentile?: number };
        isKnownExploited?: boolean;
        cisaKev?: { vendorProject?: string; product?: string; requiredAction?: string; dateAdded?: string };
        published?: string;
      };

      if (!serverCve || !serverCve.id) return null;

      return {
        cve_id: serverCve.id,
        summary: serverCve.summary || "No summary available.",
        cvss: serverCve.cvss ?? null,
        cvss_version: serverCve.cvss ? 3 : null,
        cvss_v2: null,
        cvss_v3: serverCve.cvss ?? null,
        cvss_v4: null,
        epss: serverCve.epss?.score ?? null,
        ranking_epss: serverCve.epss?.percentile ?? null,
        kev: serverCve.isKnownExploited || Boolean(serverCve.cisaKev),
        propose_action: serverCve.cisaKev?.requiredAction ?? null,
        ransomware_campaign: null,
        references: serverCve.references || [],
        vendor: serverCve.cisaKev?.vendorProject ?? null,
        product: serverCve.cisaKev?.product ?? null,
        version: null,
        published_time: serverCve.published ?? null,
        cpes: serverCve.vulnerableProducts || [],
      };
    }

    const url = `https://cvedb.shodan.io/cve/${encodeURIComponent(cveId)}`;
    const proxyUrl = getProxiedUrl(url, settings.corsProvider, settings.customCorsUrl);
    const response = await authenticatedFetch(proxyUrl);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`CVEDB API returned ${response.status} ${response.statusText}`);
    }

    const data: CveData = await response.json();
    return data;
  } catch (error) {
    logger.error(`Error querying CVEDB for ${cveId}`, error);
    throw error;
  }
}
