import { logger } from "./logger";
import { type AppSettings } from "./settings";
import { getProxiedUrl, authenticatedFetch } from "./cors";

export interface InternetDbHost {
  ip: string;
  ports: number[];
  cpes: string[];
  hostnames: string[];
  tags: string[];
  vulns: string[];
}

export async function queryInternetDb(ip: string, settings: AppSettings): Promise<InternetDbHost | null> {
  try {
    const url = `https://internetdb.shodan.io/${ip}`;
    const proxyUrl = getProxiedUrl(url, settings.corsProvider, settings.customCorsUrl);
    const response = await authenticatedFetch(proxyUrl);

    if (response.status === 404) {
      return null; // No open ports / data found
    }

    if (!response.ok) {
      throw new Error(`InternetDB API returned ${response.status} ${response.statusText}`);
    }

    const data: InternetDbHost = await response.json();
    return data;
  } catch (error) {
    logger.error("Error querying InternetDB", error);
    throw error;
  }
}
