import { Hono } from 'hono';
import { enumerateSubdomains } from '../services/subdomainService';
import { lookupMacAddress } from '../services/macService';
import { lookupGeoIp, lookupAsn } from '../services/geoipService';

export const networkRouter = new Hono();

networkRouter.get('/subdomains', async (c) => {
  const domain = c.req.query('domain') || c.req.query('name');
  if (!domain) {
    return c.json({ success: false, error: 'Query parameter "domain" is required.' }, 400);
  }

  try {
    const data = await enumerateSubdomains(domain);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'Subdomain enumeration failed'
    }, 500);
  }
});

networkRouter.get('/my-ip', async (c) => {
  // Extract Cloudflare Edge context if available
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  
  // Cloudflare cf object can be available on raw request
  const cf = (c.req.raw as unknown as { cf?: {
    country?: string;
    region?: string;
    regionCode?: string;
    city?: string;
    postalCode?: string;
    latitude?: string;
    longitude?: string;
    timezone?: string;
    asn?: number;
    asOrganization?: string;
    colo?: string;
  } }).cf;

  if (cf && cf.country) {
    return c.json({
      success: true,
      data: {
        ip: clientIp,
        ipVersion: clientIp.includes(':') ? 6 : 4,
        country: cf.country,
        region: cf.region,
        regionCode: cf.regionCode,
        city: cf.city,
        postalCode: cf.postalCode,
        latitude: cf.latitude ? parseFloat(cf.latitude) : undefined,
        longitude: cf.longitude ? parseFloat(cf.longitude) : undefined,
        timezone: cf.timezone,
        asn: cf.asn,
        asOrganization: cf.asOrganization,
        colo: cf.colo,
        source: 'Cloudflare Edge Context'
      }
    });
  }

  // Otherwise query GeoIP service for the extracted IP
  try {
    const data = await lookupGeoIp(clientIp);
    return c.json({
      success: true,
      data: {
        ...data,
        source: 'GeoIP Lookup Fallback'
      }
    });
  } catch {
    return c.json({
      success: true,
      data: {
        ip: clientIp,
        ipVersion: clientIp.includes(':') ? 6 : 4
      }
    });
  }
});

networkRouter.get('/geoip', async (c) => {
  const ip = c.req.query('ip');
  if (!ip) {
    return c.json({ success: false, error: 'Query parameter "ip" is required.' }, 400);
  }

  try {
    const data = await lookupGeoIp(ip);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'GeoIP lookup failed'
    }, 500);
  }
});

networkRouter.get('/asn', async (c) => {
  const asnParam = c.req.query('asn');
  const ipParam = c.req.query('ip');

  if (!asnParam && !ipParam) {
    return c.json({ success: false, error: 'Query parameter "asn" or "ip" is required.' }, 400);
  }

  try {
    let targetAsn = asnParam;
    if (!targetAsn && ipParam) {
      const geo = await lookupGeoIp(ipParam);
      if (!geo.asn) throw new Error(`Could not determine ASN for IP ${ipParam}`);
      targetAsn = String(geo.asn);
    }

    const data = await lookupAsn(targetAsn!);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'ASN lookup failed'
    }, 500);
  }
});

networkRouter.get('/mac', async (c) => {
  const mac = c.req.query('mac');
  if (!mac) {
    return c.json({ success: false, error: 'Query parameter "mac" is required.' }, 400);
  }

  try {
    const data = await lookupMacAddress(mac);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'MAC lookup failed'
    }, 500);
  }
});
