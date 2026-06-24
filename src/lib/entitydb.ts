import { logger } from "./logger";
import { type AppSettings } from "./settings";
import { getProxiedUrl, authenticatedFetch } from "./cors";

export interface LightEntity {
  id: number;
  cik: number;
  tickers: string[];
  entity_name: string;
}

export interface EntityFullInfo {
  finance_data: any[];
  entity: {
    id: number;
    cik: number;
    tickers: string[];
    entity_name: string;
    exchanges: string[];
    updated_at: string;
    extra_info: {
      alias: string[];
      domain: string[];
    };
    [key: string]: any;
  };
  executives: any[];
}

export async function searchEntities(settings: AppSettings): Promise<LightEntity[]> {
  try {
    const url = `https://entitydb.shodan.io/api/entities`;
    const proxyUrl = getProxiedUrl(url, settings.corsProvider, settings.customCorsUrl);
    const response = await authenticatedFetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`EntityDB API returned ${response.status}`);
    }

    const data = await response.json();
    return data.entities || [];
  } catch (error) {
    logger.error(`Error fetching entities`, error);
    throw error;
  }
}

export async function getEntityBySymbol(symbol: string, settings: AppSettings): Promise<EntityFullInfo | null> {
  try {
    const url = `https://entitydb.shodan.io/api/entities/symbol/${encodeURIComponent(symbol)}`;
    const proxyUrl = getProxiedUrl(url, settings.corsProvider, settings.customCorsUrl);
    const response = await authenticatedFetch(proxyUrl);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`EntityDB API returned ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error(`Error querying EntityDB for ${symbol}`, error);
    throw error;
  }
}
