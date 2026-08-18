import type { AppSettings } from "./settings"
import { logger } from "./logger"
import { getProxiedUrl, authenticatedFetch } from "./cors"
import { isCustomServerEnabled, queryMyIpServer, queryGeoIpServer, queryAsnServer } from "./apiServer"
export interface ParsedASN {
  org?: string;
  asn?: string;
  rir?: string;
  type?: string;
  description?: string;
  domain?: string;
  route?: string;
  created?: string;
  updated?: string;
  is_datacenter?: boolean;
  is_vpn?: boolean;
  is_proxy?: boolean;
  is_tor?: boolean;
  is_abuser?: boolean;
  is_bogon?: boolean;
  is_crawler?: boolean;
  is_satellite?: boolean;
  is_mobile?: boolean;
  abuser_score?: string;
  dc_name?: string;
  dc_network?: string;
  abuse_email?: string;
  abuse_phone?: string;
  abuse_address?: string;
  country?: string;
  continent?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  website?: string;
  traffic_ratio?: string;
  scope?: string;
  irr_as_set?: string;
  ix_count?: number;
  local_time?: string;
  country_code?: string;
  abuse_name?: string;
  notes?: string;
  prefixes_v4?: string[];
  prefixes_v6?: string[];
  fac_count?: number;
}

interface IPAPIResponse {
  asn?: number | {
    asn: number;
    org?: string;
    descr?: string;
    domain?: string;
    type?: string;
    rir?: string;
    route?: string;
    created?: string;
    updated?: string;
    abuse?: string;
    country?: string;
    abuser_score?: string;
  };
  org?: string;
  descr?: string;
  company?: {
    name?: string;
    domain?: string;
    type?: string;
    abuser_score?: string;
  };
  domain?: string;
  type?: string;
  rir?: string;
  created?: string;
  updated?: string;
  abuser_score?: string;
  is_bogon?: boolean;
  is_mobile?: boolean;
  is_satellite?: boolean;
  is_crawler?: boolean;
  is_datacenter?: boolean;
  is_tor?: boolean;
  is_proxy?: boolean;
  is_vpn?: boolean;
  is_abuser?: boolean;
  datacenter?: {
    datacenter?: string;
    network?: string;
  };
  abuse?: {
    email?: string;
    name?: string;
    phone?: string;
    address?: string;
  };
  location?: {
    country?: string;
    country_code?: string;
    city?: string;
    state?: string;
    continent?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    zip?: string;
    local_time?: string;
  };
  country?: string;
  prefixes?: string[];
  prefixesIPv6?: string[];
}

interface RIPEData {
  holder?: string;
  block?: {
    desc?: string;
  };
}

interface RIPEstatResponse {
  data?: RIPEData;
}

interface PeeringDBItem {
  asn?: number;
  name?: string;
  aka?: string;
  website?: string;
  info_type?: string;
  created?: string;
  updated?: string;
  irr_as_set?: string;
  info_ratio?: string;
  info_scope?: string;
  ix_count?: number;
  fac_count?: number;
  policy_general?: string;
  notes?: string;
}

export interface ASNResult {
  query: string;
  isAsn: boolean;
  ipapi?: IPAPIResponse;
  ripe?: RIPEstatResponse;
  peeringdb?: PeeringDBItem;
  parsed?: ParsedASN;
}
export async function queryASN(ipOrAsn: string, settings: AppSettings): Promise<ASNResult> {
  const query = ipOrAsn.trim();
  const isAsn = /^AS\d+$/i.test(query);
  const resultData: ASNResult = {
    query: query,
    isAsn: isAsn
  };

  // If custom API server is active, route through backend worker
  if (isCustomServerEnabled(settings)) {
    try {
      let serverData: {
        ip?: string;
        asn?: number;
        asOrganization?: string;
        name?: string;
        description?: string;
        country?: string;
        countryCode?: string;
        region?: string;
        city?: string;
        timezone?: string;
        latitude?: number;
        longitude?: number;
        isDatacenter?: boolean;
        isVpn?: boolean;
        isProxy?: boolean;
        isTor?: boolean;
        abuseContacts?: string[];
        peeringDb?: { org?: string; website?: string; ixCount?: number; facCount?: number };
        origins?: number[];
        prefixes?: string[];
        colo?: string;
      };

      if (!query) {
        serverData = (await queryMyIpServer(settings)) as typeof serverData;
      } else if (isAsn) {
        serverData = (await queryAsnServer(query, settings)) as typeof serverData;
      } else {
        serverData = (await queryGeoIpServer(query, settings)) as typeof serverData;
      }

      const asnVal = serverData.asn ? `AS${serverData.asn}` : (isAsn ? query : undefined);
      resultData.parsed = {
        asn: asnVal,
        org: serverData.asOrganization || serverData.name || serverData.description || serverData.peeringDb?.org,
        description: serverData.description || serverData.name,
        country: serverData.country,
        country_code: serverData.countryCode,
        city: serverData.city,
        state: serverData.region,
        timezone: serverData.timezone,
        lat: serverData.latitude,
        lon: serverData.longitude,
        is_datacenter: serverData.isDatacenter,
        is_vpn: serverData.isVpn,
        is_proxy: serverData.isProxy,
        is_tor: serverData.isTor,
        abuse_email: serverData.abuseContacts?.[0],
        website: serverData.peeringDb?.website,
        ix_count: serverData.peeringDb?.ixCount,
        fac_count: serverData.peeringDb?.facCount,
        prefixes_v4: serverData.prefixes || [],
      };
      resultData.ipapi = {
        asn: serverData.asn ? {
          asn: serverData.asn,
          org: serverData.asOrganization,
        } : undefined,
        location: {
          country: serverData.country,
          country_code: serverData.countryCode,
          city: serverData.city,
          state: serverData.region,
          timezone: serverData.timezone,
          latitude: serverData.latitude,
          longitude: serverData.longitude,
        },
        datacenter: {
          datacenter: serverData.colo,
        },
      } as IPAPIResponse;

      return resultData;
    } catch (err) {
      logger.warn("Custom server IP/ASN query failed, falling back to local client:", err);
    }
  }
  
  // 1. Try primary ipapi.is lookup
  try {
    const targetUrl = `https://api.ipapi.is/?q=${query}`;
    const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
    const res = await fetchWithTimeout(proxyUrl, 8000);
    if (res.ok) {
      resultData.ipapi = await res.json();
    }
  } catch { logger.warn("IPAPI fetch failed."); }

  // 2. IP Queries fallback cascade: ipwhois.app -> ip-api.com
  if (!isAsn && (!resultData.ipapi || resultData.ipapi.is_bogon === undefined)) {
    // Try ipwhois.app
    try {
      const targetUrl = `https://ipwhois.app/json/${query}`;
      const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
      const res = await fetchWithTimeout(proxyUrl, 8000);
      if (res.ok) {
        const ipw = await res.json();
        if (ipw && ipw.success !== false) {
          const cleanAsnNum = ipw.asn ? parseInt(ipw.asn.replace(/as/i, ''), 10) : undefined;
          resultData.ipapi = {
            asn: cleanAsnNum ? {
              asn: cleanAsnNum,
              org: ipw.org || ipw.isp,
              descr: ipw.org || ipw.isp,
              country: ipw.country_code
            } : undefined,
            org: ipw.org || ipw.isp,
            descr: ipw.org || ipw.isp,
            country: ipw.country,
            location: {
              country: ipw.country,
              country_code: ipw.country_code,
              city: ipw.city,
              state: ipw.region,
              continent: ipw.continent,
              latitude: ipw.latitude,
              longitude: ipw.longitude,
              timezone: ipw.timezone
            }
          };
        }
      }
    } catch { logger.warn("ipwhois.app fetch failed."); }

    // Try ip-api.com if ipwhois failed
    if (!resultData.ipapi) {
      try {
        const targetUrl = `http://ip-api.com/json/${query}`;
        const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
        const res = await fetchWithTimeout(proxyUrl, 8000);
        if (res.ok) {
          const ipa = await res.json();
          const statusSuccess = ipa && ipa.status === 'success';
          if (statusSuccess) {
            const org = ipa.org || ipa.isp;
            const asnStr = ipa.as ? ipa.as.split(' ')[0] : undefined;
            const cleanAsnNum = asnStr ? parseInt(String(asnStr).replace(/as/i, ''), 10) : undefined;
            resultData.ipapi = {
              asn: cleanAsnNum ? {
                asn: cleanAsnNum,
                org: org,
                descr: ipa.as || org,
                country: ipa.countryCode
              } : undefined,
              org: org,
              descr: ipa.as || org,
              country: ipa.country,
              location: {
                country: ipa.country,
                country_code: ipa.countryCode,
                city: ipa.city,
                state: ipa.regionName,
                latitude: ipa.lat,
                longitude: ipa.lon,
                timezone: ipa.timezone,
                zip: ipa.zip
              }
            };
          }
        }
      } catch { logger.warn("Fallback Geo-IP fetch failed."); }
    }
  }

  // 3. ASN queries ripeoverview fetch
  if (isAsn && !resultData.ipapi) {
    try {
      const targetUrl = `https://stat.ripe.net/data/as-overview/data.json?resource=${query}`;
      const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
      const res = await fetchWithTimeout(proxyUrl, 10000);
      if (res.ok) {
        resultData.ripe = await res.json();
      }
    } catch { logger.warn("RIPEstat fetch failed."); }
  }

  // 4. ASN queries peeringdb fetch
  if (isAsn) {
    try {
      const cleanAsn = query.replace(/AS/i, '');
      const targetUrl = `https://www.peeringdb.com/api/net?asn=${cleanAsn}`;
      const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
      const res = await fetchWithTimeout(proxyUrl, 10000);
      if (res.ok) {
        const pdb = await res.json();
        if (pdb.data && pdb.data.length > 0) {
          resultData.peeringdb = pdb.data[0];
        }
      }
    } catch { logger.warn("PeeringDB fetch failed."); }
  }

  if (!resultData.ipapi && !resultData.ripe && !resultData.peeringdb) {
    throw new Error("Could not retrieve data from any IP/ASN provider.");
  }

  const ipapi: IPAPIResponse = resultData.ipapi || {};
  const isDirectAsn = typeof ipapi.asn === 'number';
  const ipapiAsn = typeof ipapi.asn === 'object' ? ipapi.asn : null;
  const pdb = resultData.peeringdb || {};
  const ripe = resultData.ripe?.data || {};
  
  resultData.parsed = {
    asn: isDirectAsn ? `AS${ipapi.asn}` : (ipapiAsn?.asn ? `AS${ipapiAsn.asn}` : (pdb.asn ? `AS${pdb.asn}` : query)),
    org: isDirectAsn ? (ipapi.org || ipapi.descr) : (ipapi.company?.name || ipapiAsn?.org || ipapiAsn?.descr || pdb.name || ripe.holder),
    description: isDirectAsn ? ipapi.descr : (ipapiAsn?.descr || pdb.aka),
    domain: isDirectAsn ? ipapi.domain : (ipapi.company?.domain || ipapiAsn?.domain || pdb.website),
    type: isDirectAsn ? ipapi.type : (ipapi.company?.type || ipapiAsn?.type || pdb.info_type),
    rir: isDirectAsn ? ipapi.rir : (ipapi.rir || ipapiAsn?.rir || ripe.block?.desc),
    route: !isDirectAsn ? ipapiAsn?.route : undefined,
    created: isDirectAsn ? ipapi.created : (ipapiAsn?.created || pdb.created),
    updated: isDirectAsn ? ipapi.updated : (ipapiAsn?.updated || pdb.updated),
    abuser_score: isDirectAsn ? ipapi.abuser_score : (ipapi.company?.abuser_score || ipapiAsn?.abuser_score),
    is_bogon: ipapi.is_bogon || false,
    is_mobile: ipapi.is_mobile || false,
    is_satellite: ipapi.is_satellite || false,
    is_crawler: ipapi.is_crawler || false,
    is_datacenter: ipapi.is_datacenter || false,
    is_tor: ipapi.is_tor || false,
    is_proxy: ipapi.is_proxy || false,
    is_vpn: ipapi.is_vpn || false,
    is_abuser: ipapi.is_abuser || false,
    dc_name: ipapi.datacenter?.datacenter,
    dc_network: ipapi.datacenter?.network,
    abuse_email: isDirectAsn ? (typeof ipapi.asn === 'object' ? ipapi.asn?.abuse : undefined) : (ipapi.abuse?.email || ipapiAsn?.abuse),
    abuse_name: !isDirectAsn ? ipapi.abuse?.name : undefined,
    abuse_phone: !isDirectAsn ? ipapi.abuse?.phone : undefined,
    abuse_address: !isDirectAsn ? ipapi.abuse?.address : undefined,
    country: isDirectAsn ? ipapi.country : (ipapi.location?.country || ipapiAsn?.country),
    country_code: !isDirectAsn ? ipapi.location?.country_code : (isDirectAsn ? ipapi.country : undefined),
    city: !isDirectAsn ? ipapi.location?.city : undefined,
    state: !isDirectAsn ? ipapi.location?.state : undefined,
    continent: !isDirectAsn ? ipapi.location?.continent : undefined,
    lat: !isDirectAsn ? ipapi.location?.latitude : undefined,
    lon: !isDirectAsn ? ipapi.location?.longitude : undefined,
    timezone: !isDirectAsn ? ipapi.location?.timezone : undefined,
    zip: !isDirectAsn ? ipapi.location?.zip : undefined,
    local_time: !isDirectAsn ? ipapi.location?.local_time : undefined,
    website: pdb.website,
    irr_as_set: pdb.irr_as_set,
    traffic_ratio: pdb.info_ratio,
    scope: pdb.info_scope,
    ix_count: pdb.ix_count,
    fac_count: pdb.fac_count,
    notes: pdb.notes,
    prefixes_v4: ipapi.prefixes || [],
    prefixes_v6: ipapi.prefixesIPv6 || []
  };
  return resultData;
}
async function fetchWithTimeout(url: string, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await authenticatedFetch(url, { signal: controller.signal });
  clearTimeout(id);
  return response;
}