import type { GeoIpResult, AsnInfo } from '../types';

function getCountryName(countryCode?: string): string | undefined {
  if (!countryCode || countryCode.length !== 2) return undefined;
  try {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(countryCode.toUpperCase());
  } catch {
    return countryCode;
  }
}

export async function lookupGeoIp(ip: string): Promise<GeoIpResult> {
  const cleanIp = ip.trim();
  const isIpv6 = cleanIp.includes(':');
  const sourcesUsed: string[] = [];

  let country: string | undefined;
  let countryCode: string | undefined;
  let countryCode3: string | undefined;
  let region: string | undefined;
  let regionCode: string | undefined;
  let city: string | undefined;
  let postalCode: string | undefined;
  let latitude: number | undefined;
  let longitude: number | undefined;
  let timezone: string | undefined;
  let isp: string | undefined;
  let asn: number | undefined;
  let asOrganization: string | undefined;
  let isDatacenter: boolean | undefined;
  let isVpn: boolean | undefined;
  let isProxy: boolean | undefined;
  let isTor: boolean | undefined;
  let abuseContacts: string[] | undefined;
  let stopForumSpam: { appears?: number } | undefined;
  const routingPrefixes: string[] = [];

  // 1. Query IPAPI.is (Rich security & proxy detection)
  const fetchIpApiIs = async () => {
    try {
      const res = await fetch(`https://api.ipapi.is/?q=${encodeURIComponent(cleanIp)}`, {
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json() as {
          is_datacenter?: boolean;
          is_vpn?: boolean;
          is_proxy?: boolean;
          is_tor?: boolean;
          company_name?: string;
          company?: { name?: string };
          asn_num?: number;
          asn_org?: string;
          asn?: { asn?: number; org?: string } | number;
          cc?: string;
          lat?: number;
          lon?: number;
          country?: string;
          location?: { country?: string; country_code?: string; state?: string; city?: string; postal?: string; latitude?: number; longitude?: number; timezone?: string };
        };
        isDatacenter = data.is_datacenter;
        isVpn = data.is_vpn;
        isProxy = data.is_proxy;
        isTor = data.is_tor;
        const asnVal = data.asn_num ?? (typeof data.asn === 'number' ? data.asn : data.asn?.asn);
        if (asnVal && !asn) asn = asnVal;
        const orgVal = data.asn_org ?? (typeof data.asn === 'object' ? data.asn?.org : undefined);
        if (orgVal && !asOrganization) asOrganization = orgVal;
        const compVal = data.company_name || data.company?.name;
        if (compVal && !isp) isp = compVal;
        if (data.country && !country) country = data.country;
        if (data.location?.country && !country) country = data.location.country;
        const ccVal = data.cc || data.location?.country_code;
        if (ccVal && !countryCode) countryCode = ccVal;
        if (data.location?.city && !city) city = data.location.city;
        if (data.location?.state && !region) region = data.location.state;
        const latVal = data.lat ?? data.location?.latitude;
        if (latVal !== undefined && latitude === undefined) latitude = latVal;
        const lonVal = data.lon ?? data.location?.longitude;
        if (lonVal !== undefined && longitude === undefined) longitude = lonVal;
        if (data.location?.timezone && !timezone) timezone = data.location.timezone;
        sourcesUsed.push('ipapi.is');
      }
    } catch {
      // ignore
    }
  };

  // 2. Query FreeIPAPI
  const fetchFreeIpApi = async () => {
    try {
      const res = await fetch(`https://freeipapi.com/api/json/${encodeURIComponent(cleanIp)}`, {
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json() as {
          countryName?: string;
          countryCode?: string;
          regionName?: string;
          cityName?: string;
          zipCode?: string;
          latitude?: number;
          longitude?: number;
          timeZone?: string;
          asn?: number;
        };
        if (data.countryName && !country) country = data.countryName;
        if (data.countryCode && !countryCode) countryCode = data.countryCode;
        if (data.cityName && !city) city = data.cityName;
        if (data.regionName && !region) region = data.regionName;
        if (data.zipCode && !postalCode) postalCode = data.zipCode;
        if (data.latitude && !latitude) latitude = data.latitude;
        if (data.longitude && !longitude) longitude = data.longitude;
        if (data.timeZone && !timezone) timezone = data.timeZone;
        if (data.asn && !asn) asn = data.asn;
        sourcesUsed.push('freeipapi.com');
      }
    } catch {
      // ignore
    }
  };

  // 3. Query IPLocation.net
  const fetchIpLocation = async () => {
    try {
      const res = await fetch(`https://api.iplocation.net/?ip=${encodeURIComponent(cleanIp)}`, {
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json() as { country_name?: string; country_code2?: string; isp?: string };
        if (data.country_name && !country) country = data.country_name;
        if (data.country_code2 && !countryCode) countryCode = data.country_code2;
        if (data.isp && !isp) isp = data.isp;
        sourcesUsed.push('iplocation.net');
      }
    } catch {
      // ignore
    }
  };

  // 4. Query IP2C for ISO3 verification
  const fetchIp2c = async () => {
    try {
      const res = await fetch(`https://ip2c.org/${encodeURIComponent(cleanIp)}`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const text = await res.text();
        const parts = text.split(';');
        if (parts[0] === '1') {
          if (!countryCode) countryCode = parts[1];
          if (!countryCode3) countryCode3 = parts[2];
          if (!country) country = parts[3];
          sourcesUsed.push('ip2c.org');
        }
      }
    } catch {
      // ignore
    }
  };

  // 5. Query RIPE Stat Abuse Contact Finder
  const fetchAbuseContacts = async () => {
    try {
      const res = await fetch(`https://stat.ripe.net/data/abuse-contact-finder/data.json?resource=${encodeURIComponent(cleanIp)}`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const data = await res.json() as { data?: { abuse_contacts?: string[] } };
        if (data.data?.abuse_contacts && data.data.abuse_contacts.length > 0) {
          abuseContacts = data.data.abuse_contacts;
          sourcesUsed.push('RIPE Stat Abuse Contacts');
        }
      }
    } catch {
      // ignore
    }
  };

  // 6. Query StopForumSpam IP Check
  const fetchStopForumSpam = async () => {
    if (isIpv6) return;
    try {
      const res = await fetch(`https://api.stopforumspam.org/api?ip=${encodeURIComponent(cleanIp)}&json`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const data = await res.json() as { ip?: { appears?: number; frequency?: number } };
        if (typeof data.ip?.appears === 'number') {
          stopForumSpam = { appears: data.ip.appears };
          sourcesUsed.push('StopForumSpam');
        }
      }
    } catch {
      // ignore
    }
  };

  await Promise.allSettled([
    fetchIpApiIs(),
    fetchFreeIpApi(),
    fetchIpLocation(),
    fetchIp2c(),
    fetchAbuseContacts(),
    fetchStopForumSpam()
  ]);

  if (!country && countryCode) {
    country = getCountryName(countryCode);
  }

  return {
    ip: cleanIp,
    ipVersion: isIpv6 ? 6 : 4,
    country,
    countryCode,
    countryCode3,
    region,
    regionCode,
    city,
    postalCode,
    latitude,
    longitude,
    timezone,
    isp,
    asn,
    asOrganization,
    isDatacenter,
    isVpn,
    isProxy,
    isTor,
    abuseContacts,
    stopForumSpam,
    routingPrefixes: routingPrefixes.length > 0 ? routingPrefixes : undefined,
    sourcesUsed
  };
}

export async function lookupAsn(asnNumber: number | string): Promise<AsnInfo> {
  const cleanAsn = String(asnNumber).replace(/^AS/i, '').trim();
  const num = parseInt(cleanAsn, 10);
  if (isNaN(num)) {
    throw new Error('Invalid ASN number');
  }

  let asnName = '';
  let description = '';
  let country = '';
  let allocated = '';
  const origins: number[] = [num];
  let prefixes: string[] = [];
  let abuseContacts: string[] = [];
  let peeringDbData: AsnInfo['peeringDb'] = undefined;

  // 1. Query RIPE Stat AS overview
  const fetchRipeOverview = async () => {
    try {
      const ripeUrl = `https://stat.ripe.net/data/as-overview/data.json?resource=AS${num}`;
      const ripeRes = await fetch(ripeUrl, { signal: AbortSignal.timeout(3500) });
      if (ripeRes.ok) {
        const ripeJson = await ripeRes.json() as {
          data?: {
            holder?: string;
            announced?: boolean;
            block?: {
              desc?: string;
              resource?: string;
              name?: string;
            };
          };
        };
        if (ripeJson.data) {
          asnName = ripeJson.data.holder || '';
          description = ripeJson.data.block?.desc || ripeJson.data.block?.name || '';
        }
      }
    } catch {
      // ignore
    }
  };

  // 2. Query PeeringDB
  const fetchPeeringDb = async () => {
    try {
      const pdbUrl = `https://www.peeringdb.com/api/net?asn=${num}`;
      const pdbRes = await fetch(pdbUrl, { signal: AbortSignal.timeout(3500) });
      if (pdbRes.ok) {
        const pdbJson = await pdbRes.json() as {
          data?: {
            name?: string;
            aka?: string;
            website?: string;
            ix_count?: number;
            fac_count?: number;
          }[];
        };
        if (pdbJson.data && pdbJson.data.length > 0) {
          const net = pdbJson.data[0];
          peeringDbData = {
            org: net.name,
            website: net.website,
            ixCount: net.ix_count,
            facCount: net.fac_count
          };
          if (!asnName && net.name) asnName = net.name;
          if (!description && net.aka) description = net.aka;
        }
      }
    } catch {
      // ignore
    }
  };

  // 3. Query RIPE Stat Routing Status
  const fetchRipeRouting = async () => {
    try {
      const routeUrl = `https://stat.ripe.net/data/routing-status/data.json?resource=AS${num}`;
      const routeRes = await fetch(routeUrl, { signal: AbortSignal.timeout(3500) });
      if (routeRes.ok) {
        const routeJson = await routeRes.json() as {
          data?: {
            first_seen?: { time?: string };
          };
        };
        if (routeJson.data?.first_seen?.time) {
          allocated = routeJson.data.first_seen.time;
        }
      }
    } catch {
      // ignore
    }
  };

  // 4. Query RIPE Stat Announced Prefixes
  const fetchRipePrefixes = async () => {
    try {
      const prefUrl = `https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS${num}`;
      const prefRes = await fetch(prefUrl, { signal: AbortSignal.timeout(3500) });
      if (prefRes.ok) {
        const prefJson = await prefRes.json() as {
          data?: {
            prefixes?: Array<{ prefix: string }>;
          };
        };
        if (prefJson.data?.prefixes) {
          prefixes = prefJson.data.prefixes.map(p => p.prefix).filter(Boolean);
        }
      }
    } catch {
      // ignore
    }
  };

  // 5. Query RIPE Stat Abuse Contacts
  const fetchRipeAbuse = async () => {
    try {
      const abuseUrl = `https://stat.ripe.net/data/abuse-contact-finder/data.json?resource=AS${num}`;
      const abuseRes = await fetch(abuseUrl, { signal: AbortSignal.timeout(3500) });
      if (abuseRes.ok) {
        const abuseJson = await abuseRes.json() as {
          data?: {
            abuse_contacts?: string[];
          };
        };
        if (abuseJson.data?.abuse_contacts) {
          abuseContacts = abuseJson.data.abuse_contacts;
        }
      }
    } catch {
      // ignore
    }
  };

  await Promise.allSettled([
    fetchRipeOverview(),
    fetchPeeringDb(),
    fetchRipeRouting(),
    fetchRipePrefixes(),
    fetchRipeAbuse()
  ]);

  return {
    asn: num,
    name: asnName || `AS${num}`,
    description,
    country,
    allocated,
    origins,
    prefixes: prefixes.length > 0 ? prefixes : undefined,
    abuseContacts: abuseContacts.length > 0 ? abuseContacts : undefined,
    peeringDb: peeringDbData
  };
}

