import { logger } from "./logger";
import { type AppSettings } from "./settings";
import { getProxiedUrl, authenticatedFetch } from "./cors";

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
