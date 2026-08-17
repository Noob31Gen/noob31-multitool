import type { GeoIpResult, AsnInfo } from '../types';

export async function lookupGeoIp(ip: string): Promise<GeoIpResult> {
  const cleanIp = ip.trim();
  const isIpv6 = cleanIp.includes(':');

  // 1. Try FreeIPAPI
  try {
    const res = await fetch(`https://freeipapi.com/api/json/${encodeURIComponent(cleanIp)}`, {
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      const data = await res.json() as {
        ipVersion?: number;
        ipAddress?: string;
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

      return {
        ip: cleanIp,
        ipVersion: isIpv6 ? 6 : 4,
        country: data.countryName,
        countryCode: data.countryCode,
        region: data.regionName,
        city: data.cityName,
        postalCode: data.zipCode,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timeZone,
        asn: data.asn
      };
    }
  } catch {
    // fallback
  }

  // 2. Fallback: ip.guide
  try {
    const res = await fetch(`https://ip.guide/${encodeURIComponent(cleanIp)}`, {
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      const data = await res.json() as {
        location?: {
          country?: string;
          country_code?: string;
          city?: string;
          latitude?: number;
          longitude?: number;
          timezone?: string;
        };
        autonomous_system?: {
          asn?: number;
          name?: string;
          organization?: string;
        };
      };

      return {
        ip: cleanIp,
        ipVersion: isIpv6 ? 6 : 4,
        country: data.location?.country,
        countryCode: data.location?.country_code,
        city: data.location?.city,
        latitude: data.location?.latitude,
        longitude: data.location?.longitude,
        timezone: data.location?.timezone,
        asn: data.autonomous_system?.asn,
        asOrganization: data.autonomous_system?.organization || data.autonomous_system?.name
      };
    }
  } catch {
    // fallback
  }

  return {
    ip: cleanIp,
    ipVersion: isIpv6 ? 6 : 4
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
  let peeringDbData: AsnInfo['peeringDb'] = undefined;

  // 1. Query RIPE Stat AS overview
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
          };
        };
      };
      if (ripeJson.data) {
        asnName = ripeJson.data.holder || '';
        description = ripeJson.data.block?.desc || '';
      }
    }
  } catch {
    // ignore
  }

  // 2. Query PeeringDB
  try {
    const pdbUrl = `https://www.peeringdb.com/api/net?asn=${num}`;
    const pdbRes = await fetch(pdbUrl, { signal: AbortSignal.timeout(3500) });
    if (pdbRes.ok) {
      const pdbJson = await pdbRes.json() as {
        data?: {
          name?: string;
          website?: string;
          ix_count?: number;
          fac_count?: number;
          notes?: string;
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
      }
    }
  } catch {
    // ignore
  }

  return {
    asn: num,
    name: asnName || `AS${num}`,
    description,
    country,
    allocated,
    peeringDb: peeringDbData
  };
}
