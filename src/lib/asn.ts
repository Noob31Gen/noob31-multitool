import type { AppSettings } from "./settings"
import { getProxiedUrl, authenticatedFetch } from "./cors"

export async function queryASN(ipOrAsn: string, settings: AppSettings) {
  const query = ipOrAsn.trim();
  const isAsn = /^AS\d+$/i.test(query);

  const resultData: any = {
    query: query,
    isAsn: isAsn
  };

  // 1. Fetch IPAPI (Primary Data)
  try {
    const targetUrl = `https://api.ipapi.is/?q=${query}`;
    const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
    const res = await authenticatedFetch(proxyUrl);
    if (res.ok) {
      resultData.ipapi = await res.json();
    }
  } catch (e) { console.warn("IPAPI fetch failed."); }

  // 2. Fetch RIPEstat (Fallback / Supplemental if IPAPI fails on ASN)
  if (isAsn && !resultData.ipapi) {
    try {
      const targetUrl = `https://stat.ripe.net/data/as-overview/data.json?resource=${query}`;
      const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
      const res = await fetchWithTimeout(proxyUrl, 10000);
      if (res.ok) {
        resultData.ripe = await res.json();
      }
    } catch (e) { console.warn("RIPEstat fetch failed."); }
  }

  // 3. Fetch PeeringDB (Supplemental Operational Data for ASNs)
  // We fetch this regardless of IPAPI success to get the deep operational notes/traffic data
  if (isAsn) {
    try {
      const cleanAsn = query.replace(/AS/i, '');
      const targetUrl = `https://www.peeringdb.com/api/net?asn=${cleanAsn}`;
      const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
      const res = await fetchWithTimeout(proxyUrl, 10000);
      if (res.ok) {
        const pdb = await res.json();
        if (pdb.data?.length > 0) {
          resultData.peeringdb = pdb.data[0];
        }
      }
    } catch (e) { console.warn("PeeringDB fetch failed."); }
  }

  if (!resultData.ipapi && !resultData.ripe && !resultData.peeringdb) {
    throw new Error("Could not retrieve data from any provider.");
  }

  // ---- NORMALIZATION LAYER ----
  // Flattening ALL possible data points for the UI
  const ipapi = resultData.ipapi || {};
  const isDirectAsn = typeof ipapi.asn === 'number';
  const pdb = resultData.peeringdb || {};
  const ripe = resultData.ripe?.data || {};

  resultData.parsed = {
    // Identity & Registration
    asn: isDirectAsn ? `AS${ipapi.asn}` : (ipapi.asn?.asn ? `AS${ipapi.asn.asn}` : (pdb.asn ? `AS${pdb.asn}` : query)),
    org: isDirectAsn ? (ipapi.org || ipapi.descr) : (ipapi.company?.name || ipapi.asn?.org || ipapi.asn?.descr || pdb.name || ripe.holder),
    description: isDirectAsn ? ipapi.descr : (ipapi.asn?.descr || pdb.aka),
    domain: isDirectAsn ? ipapi.domain : (ipapi.company?.domain || ipapi.asn?.domain || pdb.website),
    type: isDirectAsn ? ipapi.type : (ipapi.company?.type || ipapi.asn?.type || pdb.info_type),
    rir: isDirectAsn ? ipapi.rir : (ipapi.rir || ipapi.asn?.rir || ripe.block?.desc),
    route: !isDirectAsn ? ipapi.asn?.route : null,
    created: isDirectAsn ? ipapi.created : (ipapi.asn?.created || pdb.created),
    updated: isDirectAsn ? ipapi.updated : (ipapi.asn?.updated || pdb.updated),

    // Threat & Security Flags
    abuser_score: isDirectAsn ? ipapi.abuser_score : (ipapi.company?.abuser_score || ipapi.asn?.abuser_score),
    is_bogon: ipapi.is_bogon || false,
    is_mobile: ipapi.is_mobile || false,
    is_satellite: ipapi.is_satellite || false,
    is_crawler: ipapi.is_crawler || false,
    is_datacenter: ipapi.is_datacenter || false,
    is_tor: ipapi.is_tor || false,
    is_proxy: ipapi.is_proxy || false,
    is_vpn: ipapi.is_vpn || false,
    is_abuser: ipapi.is_abuser || false,

    // Datacenter Context
    dc_name: ipapi.datacenter?.datacenter,
    dc_network: ipapi.datacenter?.network,

    // Abuse Contact
    abuse_email: isDirectAsn ? ipapi.abuse : (ipapi.abuse?.email || ipapi.asn?.abuse),
    abuse_name: !isDirectAsn ? ipapi.abuse?.name : null,
    abuse_phone: !isDirectAsn ? ipapi.abuse?.phone : null,
    abuse_address: !isDirectAsn ? ipapi.abuse?.address : null,

    // Location
    country: isDirectAsn ? ipapi.country : (ipapi.location?.country || ipapi.asn?.country),
    country_code: !isDirectAsn ? ipapi.location?.country_code : (isDirectAsn ? ipapi.country : null),
    city: !isDirectAsn ? ipapi.location?.city : null,
    state: !isDirectAsn ? ipapi.location?.state : null,
    continent: !isDirectAsn ? ipapi.location?.continent : null,
    lat: !isDirectAsn ? ipapi.location?.latitude : null,
    lon: !isDirectAsn ? ipapi.location?.longitude : null,
    timezone: !isDirectAsn ? ipapi.location?.timezone : null,
    zip: !isDirectAsn ? ipapi.location?.zip : null,
    local_time: !isDirectAsn ? ipapi.location?.local_time : null,

    // Operations (PeeringDB Extras)
    website: pdb.website,
    irr_as_set: pdb.irr_as_set,
    traffic_ratio: pdb.info_ratio,
    scope: pdb.info_scope,
    ix_count: pdb.ix_count,
    fac_count: pdb.fac_count,
    policy: pdb.policy_general,
    notes: pdb.notes,

    // Prefixes
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