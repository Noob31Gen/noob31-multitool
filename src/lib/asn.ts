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

export interface IPAPIResponse {
  ip?: string;
  asn_num?: number;
  asn_org?: string;
  company_name?: string;
  cc?: string;
  lat?: number;
  lon?: number;
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

export interface RIPEData {
  holder?: string;
  block?: {
    desc?: string;
    name?: string;
    resource?: string;
  };
  announced?: boolean;
}

export interface RIPEstatResponse {
  data?: RIPEData;
}

export interface RIPEPrefixesResponse {
  data?: {
    prefixes?: Array<{
      prefix: string;
      timelines?: Array<{ starttime?: string; endtime?: string }>;
    }>;
  };
}

export interface RIPEAbuseResponse {
  data?: {
    abuse_contacts?: string[];
    authorities?: string[];
    resource?: string;
  };
}

export interface PeeringDBItem {
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
  policy_url?: string;
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

function getCountryName(countryCode?: string): string | undefined {
  if (!countryCode || countryCode.length !== 2) return undefined;
  try {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(countryCode.toUpperCase());
  } catch {
    return countryCode;
  }
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
        country: serverData.country || getCountryName(serverData.countryCode),
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
        ip: serverData.ip,
        asn_num: serverData.asn,
        asn_org: serverData.asOrganization,
        cc: serverData.countryCode,
        lat: serverData.latitude,
        lon: serverData.longitude,
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

  // ==========================================
  // PURE ASN QUERY FLOW
  // ==========================================
  if (isAsn) {
    const cleanAsnNum = query.replace(/^AS/i, '');
    let ripeOverview: RIPEstatResponse | undefined;
    let ripePrefixes: RIPEPrefixesResponse | undefined;
    let ripeAbuse: RIPEAbuseResponse | undefined;
    let peeringDbItem: PeeringDBItem | undefined;

    // Run RIPE and PeeringDB requests in parallel
    await Promise.allSettled([
      // 1. RIPE AS Overview
      (async () => {
        try {
          const targetUrl = `https://stat.ripe.net/data/as-overview/data.json?resource=AS${cleanAsnNum}`;
          const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
          const res = await fetchWithTimeout(proxyUrl, 10000);
          if (res.ok) {
            ripeOverview = await res.json();
            resultData.ripe = ripeOverview;
          }
        } catch { logger.warn("RIPEstat AS overview fetch failed."); }
      })(),

      // 2. RIPE Announced Prefixes
      (async () => {
        try {
          const targetUrl = `https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS${cleanAsnNum}`;
          const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
          const res = await fetchWithTimeout(proxyUrl, 10000);
          if (res.ok) {
            ripePrefixes = await res.json();
          }
        } catch { logger.warn("RIPEstat announced prefixes fetch failed."); }
      })(),

      // 3. RIPE Abuse Contact Finder
      (async () => {
        try {
          const targetUrl = `https://stat.ripe.net/data/abuse-contact-finder/data.json?resource=AS${cleanAsnNum}`;
          const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
          const res = await fetchWithTimeout(proxyUrl, 10000);
          if (res.ok) {
            ripeAbuse = await res.json();
          }
        } catch { logger.warn("RIPEstat abuse contact fetch failed."); }
      })(),

      // 4. PeeringDB
      (async () => {
        try {
          const targetUrl = `https://www.peeringdb.com/api/net?asn=${cleanAsnNum}`;
          const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
          const res = await fetchWithTimeout(proxyUrl, 10000);
          if (res.ok) {
            const pdb = await res.json();
            if (pdb.data && pdb.data.length > 0) {
              peeringDbItem = pdb.data[0];
              resultData.peeringdb = peeringDbItem;
            }
          }
        } catch { logger.warn("PeeringDB fetch failed."); }
      })()
    ]);

    if (!ripeOverview && !peeringDbItem && !ripePrefixes) {
      throw new Error("Could not retrieve ASN data from RIPE Stat or PeeringDB.");
    }

    // Partition prefixes into IPv4 and IPv6
    const allPrefixes = ripePrefixes?.data?.prefixes || [];
    const prefixesV4: string[] = [];
    const prefixesV6: string[] = [];

    for (const item of allPrefixes) {
      if (item.prefix) {
        if (item.prefix.includes(':')) {
          prefixesV6.push(item.prefix);
        } else {
          prefixesV4.push(item.prefix);
        }
      }
    }

    const ripeData = ripeOverview?.data;
    const abuseEmails = ripeAbuse?.data?.abuse_contacts || [];

    // Extract RIR name from block desc if available (e.g. "Assigned by ARIN" -> "ARIN")
    let rirName = ripeData?.block?.desc;
    if (rirName) {
      const match = rirName.match(/Assigned by\s+([A-Z\s]+)/i);
      if (match) rirName = match[1].trim();
    }

    resultData.parsed = {
      asn: `AS${cleanAsnNum}`,
      org: peeringDbItem?.name || ripeData?.holder || `AS${cleanAsnNum}`,
      description: peeringDbItem?.aka || ripeData?.holder || peeringDbItem?.name,
      domain: peeringDbItem?.website,
      type: peeringDbItem?.info_type || (ripeData?.announced ? "Transit / ISP" : "Allocated"),
      rir: rirName || ripeData?.block?.name || "Global Registry",
      created: peeringDbItem?.created,
      updated: peeringDbItem?.updated,
      website: peeringDbItem?.website,
      irr_as_set: peeringDbItem?.irr_as_set,
      traffic_ratio: peeringDbItem?.info_ratio,
      scope: peeringDbItem?.info_scope,
      ix_count: peeringDbItem?.ix_count,
      fac_count: peeringDbItem?.fac_count,
      notes: peeringDbItem?.notes,
      abuse_email: abuseEmails.length > 0 ? abuseEmails.join(", ") : undefined,
      prefixes_v4: prefixesV4,
      prefixes_v6: prefixesV6,
      country: undefined,
      country_code: undefined,
      city: undefined,
      state: undefined,
    };

    return resultData;
  }

  // ==========================================
  // IP / MY-IP QUERY FLOW
  // ==========================================
  // 1. Try primary ipapi.is lookup
  try {
    const targetUrl = `https://api.ipapi.is/?q=${query}`;
    const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
    const res = await fetchWithTimeout(proxyUrl, 8000);
    if (res.ok) {
      const json = await res.json();
      if (json && !json.error) {
        resultData.ipapi = json;
      }
    }
  } catch { logger.warn("IPAPI fetch failed."); }

  // 2. IP Queries fallback cascade: ipwhois.app -> ip-api.com -> freeipapi.com
  if (!resultData.ipapi || (!resultData.ipapi.ip && resultData.ipapi.asn_num === undefined && resultData.ipapi.asn === undefined)) {
    // Try ipwhois.app
    try {
      const targetUrl = `https://ipwhois.app/json/${query}`;
      const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
      const res = await fetchWithTimeout(proxyUrl, 8000);
      if (res.ok) {
        const ipw = await res.json();
        if (ipw && ipw.success !== false) {
          const cleanAsnNum = ipw.asn ? parseInt(String(ipw.asn).replace(/as/i, ''), 10) : undefined;
          resultData.ipapi = {
            ip: ipw.ip || query,
            asn_num: cleanAsnNum,
            asn_org: ipw.org || ipw.isp,
            company_name: ipw.org || ipw.isp,
            cc: ipw.country_code,
            lat: ipw.latitude,
            lon: ipw.longitude,
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
          if (ipa && ipa.status === 'success') {
            const org = ipa.org || ipa.isp;
            const asnStr = ipa.as ? ipa.as.split(' ')[0] : undefined;
            const cleanAsnNum = asnStr ? parseInt(String(asnStr).replace(/as/i, ''), 10) : undefined;
            resultData.ipapi = {
              ip: ipa.query || query,
              asn_num: cleanAsnNum,
              asn_org: org,
              company_name: org,
              cc: ipa.countryCode,
              lat: ipa.lat,
              lon: ipa.lon,
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
      } catch { logger.warn("Fallback ip-api fetch failed."); }
    }

    // Try freeipapi.com if still empty
    if (!resultData.ipapi) {
      try {
        const targetUrl = `https://freeipapi.com/api/json/${query}`;
        const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
        const res = await fetchWithTimeout(proxyUrl, 8000);
        if (res.ok) {
          const fip = await res.json();
          if (fip && fip.ipAddress) {
            resultData.ipapi = {
              ip: fip.ipAddress || query,
              cc: fip.countryCode,
              lat: fip.latitude,
              lon: fip.longitude,
              country: fip.countryName,
              location: {
                country: fip.countryName,
                country_code: fip.countryCode,
                city: fip.cityName,
                state: fip.regionName,
                zip: fip.zipCode,
                timezone: fip.timeZone,
                latitude: fip.latitude,
                longitude: fip.longitude
              }
            };
          }
        }
      } catch { logger.warn("Fallback freeipapi fetch failed."); }
    }
  }

  if (!resultData.ipapi) {
    throw new Error("Could not retrieve data from any IP geolocation provider.");
  }

  const ipapi = resultData.ipapi;
  const legacyAsnObj = typeof ipapi.asn === 'object' ? ipapi.asn : null;
  const asnNum = ipapi.asn_num ?? (typeof ipapi.asn === 'number' ? ipapi.asn : legacyAsnObj?.asn);
  const asnFormatted = asnNum ? `AS${asnNum}` : undefined;
  const orgName = ipapi.asn_org || ipapi.company_name || ipapi.company?.name || legacyAsnObj?.org || ipapi.org || ipapi.descr;
  const countryCode = ipapi.cc || ipapi.location?.country_code || legacyAsnObj?.country;
  const countryName = ipapi.country || ipapi.location?.country || getCountryName(countryCode);

  resultData.parsed = {
    asn: asnFormatted || "N/A",
    org: orgName || "Unknown Organization",
    description: ipapi.descr || legacyAsnObj?.descr || orgName,
    domain: ipapi.domain || ipapi.company?.domain || legacyAsnObj?.domain,
    type: ipapi.type || ipapi.company?.type || legacyAsnObj?.type,
    rir: ipapi.rir || legacyAsnObj?.rir,
    route: legacyAsnObj?.route,
    created: ipapi.created || legacyAsnObj?.created,
    updated: ipapi.updated || legacyAsnObj?.updated,
    abuser_score: ipapi.abuser_score || ipapi.company?.abuser_score || legacyAsnObj?.abuser_score,
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
    abuse_email: ipapi.abuse?.email || legacyAsnObj?.abuse,
    abuse_name: ipapi.abuse?.name,
    abuse_phone: ipapi.abuse?.phone,
    abuse_address: ipapi.abuse?.address,
    country: countryName,
    country_code: countryCode,
    city: ipapi.location?.city,
    state: ipapi.location?.state,
    continent: ipapi.location?.continent,
    lat: ipapi.lat ?? ipapi.location?.latitude,
    lon: ipapi.lon ?? ipapi.location?.longitude,
    timezone: ipapi.location?.timezone,
    zip: ipapi.location?.zip,
    local_time: ipapi.location?.local_time,
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