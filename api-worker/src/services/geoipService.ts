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

function determineRir(
  ripeDesc?: string,
  rdapRir?: string,
  whoisSource?: string,
  asnNum?: number
): string {
  if (rdapRir) return rdapRir;
  const combined = `${ripeDesc || ''} ${whoisSource || ''}`.toUpperCase();
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

export async function lookupAsn(asnNumber: number | string): Promise<AsnInfo> {
  const cleanAsn = String(asnNumber).replace(/^AS/i, '').trim();
  const num = parseInt(cleanAsn, 10);
  if (isNaN(num)) {
    throw new Error('Invalid ASN number');
  }

  let asnName = '';
  let description = '';
  let domain = '';
  let country = '';
  let countryCode = '';
  let city = '';
  let region = '';
  let rir = '';
  let type = '';
  let allocated = '';
  let created = '';
  let updated = '';
  const origins: number[] = [num];
  let prefixes: string[] = [];
  let prefixesIPv6: string[] = [];
  let abuseContacts: string[] = [];
  let abusePhone: string | undefined;
  let abuseAddress: string | undefined;
  let trafficRatio: string | undefined;
  let scope: string | undefined;
  let irrAsSet: string | undefined;
  let notes: string | undefined;
  let peeringDbData: AsnInfo['peeringDb'] = undefined;
  let ripeBlockDesc: string | undefined;
  let whoisSource: string | undefined;

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
          if (!asnName && ripeJson.data.holder) asnName = ripeJson.data.holder;
          ripeBlockDesc = ripeJson.data.block?.desc || ripeJson.data.block?.name || '';
          if (!description && ripeBlockDesc) description = ripeBlockDesc;
          if (ripeJson.data.announced) {
            type = 'Transit / ISP';
          }
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
            info_type?: string;
            info_ratio?: string;
            info_scope?: string;
            irr_as_set?: string;
            created?: string;
            updated?: string;
            notes?: string;
            city?: string;
            country?: string;
            ix_count?: number;
            fac_count?: number;
          }[];
        };
        if (pdbJson.data && pdbJson.data.length > 0) {
          const net = pdbJson.data[0];
          peeringDbData = {
            org: net.name,
            aka: net.aka,
            website: net.website,
            infoType: net.info_type,
            infoRatio: net.info_ratio,
            infoScope: net.info_scope,
            irrAsSet: net.irr_as_set,
            created: net.created,
            updated: net.updated,
            notes: net.notes,
            ixCount: net.ix_count,
            facCount: net.fac_count
          };
          if (net.name) asnName = net.name;
          if (net.aka && !description) description = net.aka;
          if (net.website) {
            domain = net.website.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
          }
          if (net.info_type) type = net.info_type;
          if (net.info_ratio) trafficRatio = net.info_ratio;
          if (net.info_scope) scope = net.info_scope;
          if (net.irr_as_set) irrAsSet = net.irr_as_set;
          if (net.created && !created) created = net.created;
          if (net.updated && !updated) updated = net.updated;
          if (net.notes && !notes) notes = net.notes;
          if (net.country && !countryCode) countryCode = net.country;
          if (net.city && !city) city = net.city;
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
          if (!created) created = routeJson.data.first_seen.time;
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
          for (const item of prefJson.data.prefixes) {
            if (item.prefix) {
              if (item.prefix.includes(':')) {
                prefixesIPv6.push(item.prefix);
              } else {
                prefixes.push(item.prefix);
              }
            }
          }
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
        if (abuseJson.data?.abuse_contacts && abuseJson.data.abuse_contacts.length > 0) {
          abuseContacts.push(...abuseJson.data.abuse_contacts);
        }
      }
    } catch {
      // ignore
    }
  };

  // 6. Query RDAP autnum
  const fetchRdapAutnum = async () => {
    try {
      const rdapUrl = `https://rdap.org/autnum/${num}`;
      const res = await fetch(rdapUrl, {
        headers: { 'Accept': 'application/rdap+json, application/json' },
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const rdap = await res.json() as {
          name?: string;
          country?: string;
          port43?: string;
          events?: Array<{ eventAction?: string; eventDate?: string }>;
          entities?: Array<{
            roles?: string[];
            vcardArray?: unknown[];
          }>;
        };
        if (rdap.name && !asnName) asnName = rdap.name;
        if (rdap.country && !countryCode) countryCode = rdap.country;
        if (rdap.port43) {
          const p = rdap.port43.toLowerCase();
          if (p.includes('arin')) rir = 'ARIN';
          else if (p.includes('ripe')) rir = 'RIPE NCC';
          else if (p.includes('apnic')) rir = 'APNIC';
          else if (p.includes('lacnic')) rir = 'LACNIC';
          else if (p.includes('afrinic')) rir = 'AFRINIC';
        }
        if (rdap.events) {
          for (const ev of rdap.events) {
            const action = (ev.eventAction || '').toLowerCase();
            if ((action === 'registration' || action === 'registered' || action === 'allocated' || action === 'assigned') && !created) {
              created = ev.eventDate || '';
            }
            if ((action === 'last changed' || action === 'updated' || action === 'last modified') && !updated) {
              updated = ev.eventDate || '';
            }
          }
        }
      }
    } catch {
      // ignore
    }
  };

  // 7. Query RIPE WHOIS records
  const fetchRipeWhois = async () => {
    try {
      const whoisUrl = `https://stat.ripe.net/data/whois/data.json?resource=AS${num}`;
      const whoisRes = await fetch(whoisUrl, { signal: AbortSignal.timeout(3500) });
      if (whoisRes.ok) {
        const whoisJson = await whoisRes.json() as {
          data?: {
            records?: Array<Array<{ key: string; value: string }>>;
          };
        };
        if (whoisJson.data?.records) {
          for (const group of whoisJson.data.records) {
            if (!Array.isArray(group)) continue;
            for (const item of group) {
              const k = (item.key || '').toLowerCase().trim();
              const v = (item.value || '').trim();
              if ((k === 'as-name' || k === 'org-name') && !asnName) asnName = v;
              if (k === 'descr' && !description) description = v;
              if (k === 'country' && !countryCode) countryCode = v.toUpperCase();
              if (k === 'created' && !created) created = v;
              if (k === 'last-modified' && !updated) updated = v;
              if ((k === 'abuse-mailbox' || k === 'abuse-email') && !abuseContacts.includes(v)) {
                abuseContacts.push(v);
              }
              if (k === 'source' && !whoisSource) whoisSource = v.toUpperCase();
            }
          }
        }
      }
    } catch {
      // ignore
    }
  };

  // 8. Query IP.guide AS endpoint
  const fetchIpGuide = async () => {
    try {
      const ipgUrl = `https://ip.guide/as${num}`;
      const ipgRes = await fetch(ipgUrl, { signal: AbortSignal.timeout(3000) });
      if (ipgRes.ok) {
        const ipgJson = await ipgRes.json() as {
          name?: string;
          country?: string;
          city?: string;
          routes?: { v4?: string[]; v6?: string[] };
        };
        if (ipgJson.name && !asnName) asnName = ipgJson.name;
        if (ipgJson.country && !countryCode) countryCode = ipgJson.country;
        if (ipgJson.city && !city) city = ipgJson.city;
        if (prefixes.length === 0 && ipgJson.routes?.v4) prefixes.push(...ipgJson.routes.v4);
        if (prefixesIPv6.length === 0 && ipgJson.routes?.v6) prefixesIPv6.push(...ipgJson.routes.v6);
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
    fetchRipeAbuse(),
    fetchRdapAutnum(),
    fetchRipeWhois(),
    fetchIpGuide()
  ]);

  if (!country && countryCode) {
    country = getCountryName(countryCode) || countryCode;
  }
  if (!rir) {
    rir = determineRir(ripeBlockDesc, undefined, whoisSource, num);
  }
  if (!type) {
    type = 'Transit / ISP';
  }

  return {
    asn: num,
    name: asnName || `AS${num}`,
    description: description || asnName || `AS${num}`,
    domain: domain || undefined,
    country: country || undefined,
    countryCode: countryCode || undefined,
    city: city || undefined,
    region: region || undefined,
    rir: rir || undefined,
    type: type || undefined,
    allocated: allocated || created || undefined,
    created: created || undefined,
    updated: updated || undefined,
    origins,
    prefixes: prefixes.length > 0 ? prefixes : undefined,
    prefixesIPv6: prefixesIPv6.length > 0 ? prefixesIPv6 : undefined,
    abuseContacts: abuseContacts.length > 0 ? Array.from(new Set(abuseContacts)) : undefined,
    abusePhone,
    abuseAddress,
    trafficRatio,
    scope,
    irrAsSet,
    notes,
    peeringDb: peeringDbData
  };
}

