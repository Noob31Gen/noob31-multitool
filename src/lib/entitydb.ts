import { logger } from "./logger";
import { type AppSettings } from "./settings";
import { getProxiedUrl, authenticatedFetch } from "./cors";
import { isCustomServerEnabled, queryCompanyServer } from "./apiServer";

export interface LightEntity {
  id: number;
  cik: number;
  tickers: string[];
  entity_name: string;
}

export interface FinanceData {
  report_year?: number;
  data_year?: number;
  data_quarter?: number;
  revenue: number;
  net_income: number;
  gross_profit: number;
  [key: string]: unknown;
}

export interface Executive {
  name: string;
  role?: string;
  title?: string;
  [key: string]: unknown;
}

export interface EntityFullInfo {
  finance_data: FinanceData[];
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
    hostname?: string;
    business_address?: string;
    phone?: string;
    sic_description?: string;
    asns?: { asn: number }[];
    [key: string]: unknown;
  };
  executives: Executive[];
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
    if (isCustomServerEnabled(settings)) {
      const res = await queryCompanyServer(symbol, settings);
      return (res as EntityFullInfo) || null;
    }

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
