import { Hono } from 'hono';
import { enumerateSubdomains } from '../services/subdomainService';
import { lookupMacAddress } from '../services/macService';
import { lookupGeoIp, lookupAsn } from '../services/geoipService';
import { jsonSuccess, jsonError } from '../utils/response';

export const networkRouter = new Hono();

networkRouter.get('/subdomains', async (c) => {
  const domain = c.req.query('domain') || c.req.query('name');
  if (!domain) {
    return jsonError(c, 'Query parameter "domain" is required.', 400, 'Example: /api/network/subdomains?domain=github.com');
  }

  try {
    const data = await enumerateSubdomains(domain);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Subdomain enumeration failed', 500);
  }
});

networkRouter.get('/my-ip', async (c) => {
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

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
    return jsonSuccess(c, {
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
    });
  }

  try {
    const data = await lookupGeoIp(clientIp);
    return jsonSuccess(c, {
      ...data,
      source: 'GeoIP Lookup Fallback'
    });
  } catch {
    return jsonSuccess(c, {
      ip: clientIp,
      ipVersion: clientIp.includes(':') ? 6 : 4
    });
  }
});

networkRouter.get('/geoip', async (c) => {
  const ip = c.req.query('ip');
  if (!ip) {
    return jsonError(c, 'Query parameter "ip" is required.', 400, 'Example: /api/network/geoip?ip=8.8.8.8');
  }

  try {
    const data = await lookupGeoIp(ip);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'GeoIP lookup failed', 500);
  }
});

networkRouter.get('/asn', async (c) => {
  const asnParam = c.req.query('asn');
  const ipParam = c.req.query('ip');

  if (!asnParam && !ipParam) {
    return jsonError(c, 'Query parameter "asn" or "ip" is required.', 400, 'Example: /api/network/asn?asn=15169');
  }

  try {
    let targetAsn = asnParam;
    if (!targetAsn && ipParam) {
      const geo = await lookupGeoIp(ipParam);
      if (!geo.asn) throw new Error(`Could not determine ASN for IP ${ipParam}`);
      targetAsn = String(geo.asn);
    }

    const data = await lookupAsn(targetAsn!);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'ASN lookup failed', 500);
  }
});

networkRouter.get('/mac', async (c) => {
  const mac = c.req.query('mac');
  if (!mac) {
    return jsonError(c, 'Query parameter "mac" is required.', 400, 'Example: /api/network/mac?mac=00:11:22:33:44:55');
  }

  try {
    const data = await lookupMacAddress(mac);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'MAC lookup failed', 500);
  }
});
