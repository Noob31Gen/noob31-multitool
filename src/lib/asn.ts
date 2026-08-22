import type { AppSettings } from "./settings"
import { logger } from "./logger"
import { getProxiedUrl, authenticatedFetch } from "./cors"
import { isCustomServerEnabled, queryMyIpServer, queryGeoIpServer, queryAsnServer } from "./apiServer"
import { queryRDAP } from "./rdap"
import { parseRDAP } from "./rdapParser"

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
  city?: string;
  country?: string;
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

function determineRir(
  ripeDesc?: string,
  rdapRir?: string,
  whoisSource?: string,
  port43?: string,
  asnNum?: number
): string {
  if (rdapRir) return rdapRir;
  const combined = `${ripeDesc || ''} ${whoisSource || ''} ${port43 || ''}`.toUpperCase();
  if (combined.includes('ARIN')) return 'ARIN';
  if (combined.includes('RIPE')) return 'RIPE NCC';
  if (combined.includes('APNIC')) return 'APNIC';
  if (combined.includes('LACNIC')) return 'LACNIC';
  if (combined.includes('AFRINIC')) return 'AFRINIC';

  if (asnNum !== undefined) {
    if ((asnNum >= 1 && asnNum <= 1876) || (asnNum >= 204 && asnNum <= 255)) return 'ARIN';
    if (asnNum >= 61440 && asnNum <= 65534) return 'Private / Reserved';
    if (asnNum >= 65536 && asnNum <= 65551) return 'Private / Reserved';
  }
  return 'Global Registry';
}

export async function queryASN(ipOrAsn: string, settings: AppSettings): Promise<ASNResult> {
  const query = (ipOrAsn || '').trim();
  const isIpQuery = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(query) || (query.includes(':') && !query.includes('.'));
  const isAsn = !isIpQuery && (/^AS\d+$/i.test(query) || (/^\d+$/.test(query) && parseInt(query, 10) <= 4200000000));
  const cleanAsnNum = isAsn ? query.replace(/^AS/i, '') : '';
  const normalizedQuery = isAsn ? `AS${cleanAsnNum}` : query;

  const resultData: ASNResult = {
    query: normalizedQuery || query,
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
        domain?: string;
        country?: string;
        countryCode?: string;
        region?: string;
        city?: string;
        timezone?: string;
        latitude?: number;
        longitude?: number;
        rir?: string;
        type?: string;
        created?: string;
        updated?: string;
        trafficRatio?: string;
        scope?: string;
        irrAsSet?: string;
        isDatacenter?: boolean;
        isVpn?: boolean;
        isProxy?: boolean;
        isTor?: boolean;
        abuseContacts?: string[];
        abusePhone?: string;
        abuseAddress?: string;
        peeringDb?: {
          org?: string;
          aka?: string;
          website?: string;
          ixCount?: number;
          facCount?: number;
          infoType?: string;
          infoRatio?: string;
          infoScope?: string;
          irrAsSet?: string;
          created?: string;
          updated?: string;
          notes?: string;
        };
        origins?: number[];
        prefixes?: string[];
        prefixesIPv6?: string[];
        colo?: string;
        notes?: string;
      };

      if (!query) {
        serverData = (await queryMyIpServer(settings)) as typeof serverData;
      } else if (isAsn) {
        serverData = (await queryAsnServer(normalizedQuery, settings)) as typeof serverData;
      } else {
        serverData = (await queryGeoIpServer(query, settings)) as typeof serverData;
      }

      const asnVal = serverData.asn ? `AS${serverData.asn}` : (isAsn ? normalizedQuery : undefined);
      const cCode = serverData.countryCode;
      const cName = serverData.country || getCountryName(cCode);

      resultData.parsed = {
        asn: asnVal,
        org: serverData.asOrganization || serverData.name || serverData.description || serverData.peeringDb?.org,
        description: serverData.description || serverData.peeringDb?.aka || serverData.name,
        domain: serverData.domain || serverData.peeringDb?.website?.replace(/^https?:\/\//i, '').replace(/\/.*$/, ''),
        country: cName,
        country_code: cCode,
        city: serverData.city,
        state: serverData.region,
        timezone: serverData.timezone,
        lat: serverData.latitude,
        lon: serverData.longitude,
        rir: serverData.rir || determineRir(undefined, undefined, undefined, undefined, serverData.asn),
        type: serverData.type || serverData.peeringDb?.infoType || "Transit / ISP",
        created: serverData.created || serverData.peeringDb?.created,
        updated: serverData.updated || serverData.peeringDb?.updated,
        is_datacenter: serverData.isDatacenter,
        is_vpn: serverData.isVpn,
        is_proxy: serverData.isProxy,
        is_tor: serverData.isTor,
        abuse_email: serverData.abuseContacts?.[0],
        abuse_phone: serverData.abusePhone,
        abuse_address: serverData.abuseAddress,
        website: serverData.peeringDb?.website,
        traffic_ratio: serverData.trafficRatio || serverData.peeringDb?.infoRatio,
        scope: serverData.scope || serverData.peeringDb?.infoScope,
        irr_as_set: serverData.irrAsSet || serverData.peeringDb?.irrAsSet,
        ix_count: serverData.peeringDb?.ixCount,
        fac_count: serverData.peeringDb?.facCount,
        notes: serverData.notes || serverData.peeringDb?.notes,
        prefixes_v4: serverData.prefixes || [],
        prefixes_v6: serverData.prefixesIPv6 || [],
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
          country: cName,
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
    let ripeOverview: RIPEstatResponse | undefined;
    let ripePrefixes: RIPEPrefixesResponse | undefined;
    let ripeAbuse: RIPEAbuseResponse | undefined;
    let peeringDbItem: PeeringDBItem | undefined;
    let rdapRaw: unknown | undefined;
    let ripeWhoisRecords: Array<Array<{ key: string; value: string }>> | undefined;
    let ipGuideData: { name?: string; country?: string; city?: string; routes?: { v4?: string[]; v6?: string[] } } | undefined;

    // Run parallel multi-source requests
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
      })(),

      // 5. RDAP autnum
      (async () => {
        try {
          rdapRaw = await queryRDAP(`AS${cleanAsnNum}`, settings);
        } catch { logger.warn("RDAP autnum fetch failed."); }
      })(),

      // 6. RIPE WHOIS records
      (async () => {
        try {
          const targetUrl = `https://stat.ripe.net/data/whois/data.json?resource=AS${cleanAsnNum}`;
          const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
          const res = await fetchWithTimeout(proxyUrl, 10000);
          if (res.ok) {
            const json = await res.json();
            if (json?.data?.records) {
              ripeWhoisRecords = json.data.records;
            }
          }
        } catch { logger.warn("RIPE WHOIS fetch failed."); }
      })(),

      // 7. IP.guide AS endpoint
      (async () => {
        try {
          const targetUrl = `https://ip.guide/as${cleanAsnNum}`;
          const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
          const res = await fetchWithTimeout(proxyUrl, 8000);
          if (res.ok) {
            ipGuideData = await res.json();
          }
        } catch { /* ignore */ }
      })()
    ]);

    if (!ripeOverview && !peeringDbItem && !ripePrefixes && !rdapRaw && !ripeWhoisRecords) {
      throw new Error("Could not retrieve ASN data from any available registries or PeeringDB.");
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

    if (prefixesV4.length === 0 && ipGuideData?.routes?.v4) {
      prefixesV4.push(...ipGuideData.routes.v4);
    }
    if (prefixesV6.length === 0 && ipGuideData?.routes?.v6) {
      prefixesV6.push(...ipGuideData.routes.v6);
    }

    const ripeData = ripeOverview?.data;
    const abuseEmails = ripeAbuse?.data?.abuse_contacts || [];

    // Parse RDAP data if available
    const rdapParsed = rdapRaw ? parseRDAP(rdapRaw as Parameters<typeof parseRDAP>[0]) : undefined;

    // Parse RIPE WHOIS fields if available
    let whoisOrg: string | undefined;
    let whoisDescr: string | undefined;
    let whoisCountry: string | undefined;
    let whoisCreated: string | undefined;
    let whoisUpdated: string | undefined;
    let whoisAbuse: string | undefined;
    let whoisSource: string | undefined;

    if (ripeWhoisRecords) {
      for (const group of ripeWhoisRecords) {
        if (!Array.isArray(group)) continue;
        for (const item of group) {
          const k = (item.key || '').toLowerCase().trim();
          const v = (item.value || '').trim();
          if (k === 'as-name' || k === 'org-name') if (!whoisOrg) whoisOrg = v;
          if (k === 'descr') if (!whoisDescr) whoisDescr = v;
          if (k === 'country') if (!whoisCountry) whoisCountry = v.toUpperCase();
          if (k === 'created') if (!whoisCreated) whoisCreated = v;
          if (k === 'last-modified') if (!whoisUpdated) whoisUpdated = v;
          if (k === 'abuse-mailbox' || k === 'abuse-email') if (!whoisAbuse) whoisAbuse = v;
          if (k === 'source') if (!whoisSource) whoisSource = v.toUpperCase();
        }
      }
    }

    const asnNumberInt = parseInt(cleanAsnNum, 10);
    const resolvedRir = determineRir(
      ripeData?.block?.desc || ripeData?.block?.name,
      rdapParsed?.rir,
      whoisSource,
      undefined,
      asnNumberInt
    );

    const countryCode = rdapParsed?.country || whoisCountry || ipGuideData?.country || peeringDbItem?.country;
    const countryName = getCountryName(countryCode) || (countryCode && countryCode.length > 2 ? countryCode : undefined);
    const orgName = peeringDbItem?.name || rdapParsed?.registrant || rdapParsed?.name || whoisOrg || ripeData?.holder || ipGuideData?.name || `AS${cleanAsnNum}`;
    const desc = peeringDbItem?.aka || whoisDescr || ripeData?.holder || rdapParsed?.name || peeringDbItem?.name;
    const website = peeringDbItem?.website;
    const domain = website ? website.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') : undefined;
    const netType = peeringDbItem?.info_type || (ripeData?.announced ? "Transit / ISP" : "Enterprise / Allocated");
    const createdDate = peeringDbItem?.created || rdapParsed?.creationDate || whoisCreated;
    const updatedDate = peeringDbItem?.updated || rdapParsed?.updatedDate || whoisUpdated;
    const finalAbuseEmail = abuseEmails.length > 0 ? abuseEmails.join(", ") : (rdapParsed?.abuseContact || whoisAbuse);

    resultData.parsed = {
      asn: `AS${cleanAsnNum}`,
      org: orgName,
      description: desc,
      domain: domain,
      type: netType,
      rir: resolvedRir,
      created: createdDate,
      updated: updatedDate,
      website: website,
      irr_as_set: peeringDbItem?.irr_as_set,
      traffic_ratio: peeringDbItem?.info_ratio,
      scope: peeringDbItem?.info_scope,
      ix_count: peeringDbItem?.ix_count,
      fac_count: peeringDbItem?.fac_count,
      notes: peeringDbItem?.notes,
      abuse_email: finalAbuseEmail,
      abuse_phone: rdapParsed?.abusePhone,
      prefixes_v4: prefixesV4,
      prefixes_v6: prefixesV6,
      country: countryName,
      country_code: countryCode,
      city: ipGuideData?.city || peeringDbItem?.city,
      state: undefined,
    };

    return resultData;
  }

  // ==========================================
  // IP / MY-IP QUERY FLOW
  // ==========================================
  // 1. Parallel query: primary ipapi.is and RIPE abuse contact finder
  let ripeAbuseContact: string | undefined;
  const fetchAbuseContactPromise = (async () => {
    try {
      const targetUrl = `https://stat.ripe.net/data/abuse-contact-finder/data.json?resource=${encodeURIComponent(query)}`;
      const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
      const res = await fetchWithTimeout(proxyUrl, 6000);
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.abuse_contacts && json.data.abuse_contacts.length > 0) {
          ripeAbuseContact = json.data.abuse_contacts.join(', ');
        }
      }
    } catch { /* ignore */ }
  })();

  try {
    const targetUrl = `https://api.ipapi.is/?q=${encodeURIComponent(query)}`;
    const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
    const res = await fetchWithTimeout(proxyUrl, 8000);
    if (res.ok) {
      const json = await res.json();
      if (json && !json.error) {
        resultData.ipapi = json;
      }
    }
  } catch { logger.warn("IPAPI fetch failed."); }

  // 2. IP Queries fallback cascade: ipwhois.app -> ip-api.com -> freeipapi.com -> ip.guide
  if (!resultData.ipapi || (!resultData.ipapi.ip && resultData.ipapi.asn_num === undefined && resultData.ipapi.asn === undefined)) {
    // Try ipwhois.app
    try {
      const targetUrl = `https://ipwhois.app/json/${encodeURIComponent(query)}`;
      const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
      const res = await fetchWithTimeout(proxyUrl, 8000);
      if (res.ok) {
        const ipw = await res.json();
        if (ipw && ipw.success !== false) {
          const cleanAsn = ipw.asn ? parseInt(String(ipw.asn).replace(/as/i, ''), 10) : undefined;
          resultData.ipapi = {
            ip: ipw.ip || query,
            asn_num: cleanAsn,
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
        const targetUrl = `http://ip-api.com/json/${encodeURIComponent(query)}`;
        const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
        const res = await fetchWithTimeout(proxyUrl, 8000);
        if (res.ok) {
          const ipa = await res.json();
          if (ipa && ipa.status === 'success') {
            const org = ipa.org || ipa.isp;
            const asnStr = ipa.as ? ipa.as.split(' ')[0] : undefined;
            const cleanAsn = asnStr ? parseInt(String(asnStr).replace(/as/i, ''), 10) : undefined;
            resultData.ipapi = {
              ip: ipa.query || query,
              asn_num: cleanAsn,
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
        const targetUrl = `https://freeipapi.com/api/json/${encodeURIComponent(query)}`;
        const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
        const res = await fetchWithTimeout(proxyUrl, 8000);
        if (res.ok) {
          const fip = await res.json();
          if (fip && fip.ipAddress) {
            resultData.ipapi = {
              ip: fip.ipAddress || query,
              asn_num: fip.asn,
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

    // Try ip.guide if still empty
    if (!resultData.ipapi) {
      try {
        const targetUrl = `https://ip.guide/${encodeURIComponent(query)}`;
        const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
        const res = await fetchWithTimeout(proxyUrl, 8000);
        if (res.ok) {
          const ipg = await res.json();
          if (ipg && ipg.ip) {
            resultData.ipapi = {
              ip: ipg.ip,
              asn_num: ipg.network?.autonomous_system?.asn,
              asn_org: ipg.network?.autonomous_system?.name || ipg.network?.autonomous_system?.organization,
              cc: ipg.location?.country,
              lat: ipg.location?.latitude,
              lon: ipg.location?.longitude,
              location: {
                country: ipg.location?.country,
                country_code: ipg.location?.country,
                city: ipg.location?.city,
                timezone: ipg.location?.timezone,
                latitude: ipg.location?.latitude,
                longitude: ipg.location?.longitude
              }
            };
          }
        }
      } catch { logger.warn("Fallback ip.guide fetch failed."); }
    }
  }

  await fetchAbuseContactPromise;

  if (!resultData.ipapi) {
    throw new Error("Could not retrieve data from any IP geolocation provider.");
  }

  const ipapi = resultData.ipapi;
  const legacyAsnObj = typeof ipapi.asn === 'object' ? ipapi.asn : null;
  const asnNum = ipapi.asn_num ?? (typeof ipapi.asn === 'number' ? ipapi.asn : legacyAsnObj?.asn);
  const asnFormatted = asnNum ? `AS${asnNum}` : undefined;

  // 3. Enrich IP query with ASN intelligence (PeeringDB, RDAP autnum, RIPE WHOIS & announced prefixes)
  let pdbNet: PeeringDBItem | undefined;
  let rdapAutnumData: unknown | undefined;
  let ripeWhoisData: Array<Array<{ key: string; value: string }>> | undefined;
  let ripeRoutingTime: string | undefined;
  const ripePrefixesList: string[] = [];
  const ripePrefixesV6List: string[] = [];
  let fallbackGeo: { city?: string; state?: string; zip?: string; timezone?: string; country?: string } = {};

  const enrichmentPromises: Promise<void>[] = [];

  // 3a. Secondary GeoIP fallback to fill gaps (city, state, zip, timezone)
  if (!ipapi.location?.city || !ipapi.location?.state || !ipapi.location?.timezone || !ipapi.location?.zip) {
    enrichmentPromises.push((async () => {
      try {
        const targetUrl = `https://freeipapi.com/api/json/${encodeURIComponent(query)}`;
        const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
        const res = await fetchWithTimeout(proxyUrl, 5000);
        if (res.ok) {
          const fip = await res.json();
          if (fip) {
            fallbackGeo = {
              city: fip.cityName,
              state: fip.regionName,
              zip: fip.zipCode,
              timezone: fip.timeZone,
              country: fip.countryName
            };
          }
        }
      } catch { /* ignore */ }
    })());
  }

  // 3b. Parallel ASN registry lookups if ASN is known
  if (asnNum) {
    // PeeringDB
    enrichmentPromises.push((async () => {
      try {
        const targetUrl = `https://www.peeringdb.com/api/net?asn=${asnNum}`;
        const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
        const res = await fetchWithTimeout(proxyUrl, 6000);
        if (res.ok) {
          const pdbJson = await res.json();
          if (pdbJson?.data?.[0]) pdbNet = pdbJson.data[0];
        }
      } catch { /* ignore */ }
    })());

    // RDAP autnum
    enrichmentPromises.push((async () => {
      try {
        const targetUrl = `https://rdap.org/autnum/${asnNum}`;
        const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
        const res = await fetchWithTimeout(proxyUrl, 6000);
        if (res.ok) {
          rdapAutnumData = await res.json();
        }
      } catch { /* ignore */ }
    })());

    // RIPE WHOIS records
    enrichmentPromises.push((async () => {
      try {
        const targetUrl = `https://stat.ripe.net/data/whois/data.json?resource=AS${asnNum}`;
        const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
        const res = await fetchWithTimeout(proxyUrl, 6000);
        if (res.ok) {
          const whoisJson = await res.json();
          if (whoisJson?.data?.records) ripeWhoisData = whoisJson.data.records;
        }
      } catch { /* ignore */ }
    })());

    // RIPE Routing Status (first_seen / created)
    enrichmentPromises.push((async () => {
      try {
        const targetUrl = `https://stat.ripe.net/data/routing-status/data.json?resource=AS${asnNum}`;
        const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
        const res = await fetchWithTimeout(proxyUrl, 6000);
        if (res.ok) {
          const routeJson = await res.json();
          if (routeJson?.data?.first_seen?.time) ripeRoutingTime = routeJson.data.first_seen.time;
        }
      } catch { /* ignore */ }
    })());

    // RIPE Announced Prefixes
    enrichmentPromises.push((async () => {
      try {
        const targetUrl = `https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS${asnNum}`;
        const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
        const res = await fetchWithTimeout(proxyUrl, 6000);
        if (res.ok) {
          const prefJson = await res.json();
          if (prefJson?.data?.prefixes) {
            for (const p of prefJson.data.prefixes) {
              if (p.prefix) {
                if (p.prefix.includes(':')) ripePrefixesV6List.push(p.prefix);
                else ripePrefixesList.push(p.prefix);
              }
            }
          }
        }
      } catch { /* ignore */ }
    })());
  }

  await Promise.allSettled(enrichmentPromises);

  // Parse ASN RDAP data if available
  const rdapParsed = rdapAutnumData ? parseRDAP(rdapAutnumData as Parameters<typeof parseRDAP>[0]) : undefined;

  // Parse RIPE WHOIS fields if available
  let whoisCreated: string | undefined;
  let whoisUpdated: string | undefined;
  let whoisSource: string | undefined;
  let whoisAbuseMail: string | undefined;

  if (ripeWhoisData) {
    for (const group of ripeWhoisData) {
      if (!Array.isArray(group)) continue;
      for (const item of group) {
        const k = (item.key || '').toLowerCase().trim();
        const v = (item.value || '').trim();
        if (k === 'created' && !whoisCreated) whoisCreated = v;
        if (k === 'last-modified' && !whoisUpdated) whoisUpdated = v;
        if (k === 'source' && !whoisSource) whoisSource = v.toUpperCase();
        if ((k === 'abuse-mailbox' || k === 'abuse-email') && !whoisAbuseMail) whoisAbuseMail = v;
      }
    }
  }

  const abuseEmail = ipapi.abuse?.email || legacyAsnObj?.abuse || ripeAbuseContact || whoisAbuseMail || rdapParsed?.abuseContact;

  // Extract domain from email helper
  const extractDomain = (email?: string): string | undefined => {
    if (!email) return undefined;
    const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return match ? match[1].toLowerCase() : undefined;
  };

  const domainInferred = ipapi.domain ||
    ipapi.company?.domain ||
    legacyAsnObj?.domain ||
    (pdbNet?.website ? pdbNet.website.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') : undefined) ||
    extractDomain(abuseEmail);

  const orgName = pdbNet?.name || ipapi.asn_org || ipapi.company_name || ipapi.company?.name || legacyAsnObj?.org || ipapi.org || ipapi.descr;
  const countryCode = ipapi.cc || ipapi.location?.country_code || legacyAsnObj?.country || pdbNet?.country || rdapParsed?.country;
  const countryName = ipapi.country || ipapi.location?.country || fallbackGeo.country || getCountryName(countryCode);
  const cityVal = ipapi.location?.city || fallbackGeo.city || pdbNet?.city;
  const stateVal = ipapi.location?.state || fallbackGeo.state;
  const zipVal = ipapi.location?.zip || fallbackGeo.zip;
  const timezoneVal = ipapi.location?.timezone || fallbackGeo.timezone;

  const resolvedCreated = pdbNet?.created || rdapParsed?.creationDate || whoisCreated || ripeRoutingTime || ipapi.created || legacyAsnObj?.created;
  const resolvedUpdated = pdbNet?.updated || rdapParsed?.updatedDate || whoisUpdated || ipapi.updated || legacyAsnObj?.updated;
  const resolvedType = pdbNet?.info_type || ipapi.type || ipapi.company?.type || legacyAsnObj?.type || "Transit / ISP";
  const resolvedRir = rdapParsed?.rir || ipapi.rir || legacyAsnObj?.rir || determineRir(undefined, undefined, whoisSource, undefined, asnNum);

  // Merge prefixes
  const finalPrefixesV4 = (ipapi.prefixes && ipapi.prefixes.length > 0) ? ipapi.prefixes : ripePrefixesList;
  const finalPrefixesV6 = (ipapi.prefixesIPv6 && ipapi.prefixesIPv6.length > 0) ? ipapi.prefixesIPv6 : ripePrefixesV6List;

  resultData.parsed = {
    asn: asnFormatted || "N/A",
    org: orgName || "Unknown Organization",
    description: pdbNet?.aka || ipapi.descr || legacyAsnObj?.descr || orgName,
    domain: domainInferred,
    type: resolvedType,
    rir: resolvedRir,
    route: legacyAsnObj?.route,
    created: resolvedCreated,
    updated: resolvedUpdated,
    website: pdbNet?.website,
    irr_as_set: pdbNet?.irr_as_set,
    traffic_ratio: pdbNet?.info_ratio,
    scope: pdbNet?.info_scope,
    ix_count: pdbNet?.ix_count,
    fac_count: pdbNet?.fac_count,
    notes: pdbNet?.notes,
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
    abuse_email: abuseEmail,
    abuse_name: ipapi.abuse?.name,
    abuse_phone: ipapi.abuse?.phone || rdapParsed?.abusePhone,
    abuse_address: ipapi.abuse?.address || rdapParsed?.abuseAddress,
    country: countryName,
    country_code: countryCode,
    city: cityVal,
    state: stateVal,
    continent: ipapi.location?.continent,
    lat: ipapi.lat ?? ipapi.location?.latitude,
    lon: ipapi.lon ?? ipapi.location?.longitude,
    timezone: timezoneVal,
    zip: zipVal,
    local_time: ipapi.location?.local_time,
    prefixes_v4: finalPrefixesV4,
    prefixes_v6: finalPrefixesV6
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