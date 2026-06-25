import { logger } from "./logger";
import { type AppSettings } from "./settings";
import { getProxiedUrl, authenticatedFetch } from "./cors";

export interface PingLocation {
  city?: string;
  country?: string;
  latlon?: string;
}

export interface PingResult {
  from_loc?: PingLocation;
  max_rtt?: number;
  min_rtt?: number;
  avg_rtt?: number;
  rtts?: number[];
  packets_sent?: number;
  packets_received?: number;
  packet_loss?: number;
  ip?: string;
  is_alive?: boolean;
  error?: string;
}

export async function queryGeoping(ipOrDomain: string, settings: AppSettings): Promise<PingResult[]> {
  try {
    const url = `https://geonet.shodan.io/api/geoping/${encodeURIComponent(ipOrDomain)}`;
    const proxyUrl = getProxiedUrl(url, settings.corsProvider, settings.customCorsUrl);
    const response = await authenticatedFetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`Geonet API returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logger.error(`Error querying Geonet for ${ipOrDomain}`, error);
    throw error;
  }
}
