import { Hono } from 'hono';
import { lookupDns, lookupReverseDns } from '../services/dnsService';
import { checkDnsPropagation } from '../services/dnsPropagationService';
import { jsonSuccess, jsonError } from '../utils/response';

export const dnsRouter = new Hono();

dnsRouter.get('/lookup', async (c) => {
  const name = c.req.query('name') || c.req.query('domain');
  const type = c.req.query('type') || 'A';
  const provider = c.req.query('provider') || 'auto';

  if (!name) {
    return jsonError(c, 'Query parameter "name" or "domain" is required.', 400, 'Example: /api/dns/lookup?name=google.com&type=A');
  }

  try {
    const data = await lookupDns(name, type, provider);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'DNS lookup failed', 500);
  }
});

dnsRouter.get('/dnssec', async (c) => {
  const name = c.req.query('name') || c.req.query('domain');
  const type = c.req.query('type') || 'DNSKEY';

  if (!name) {
    return jsonError(c, 'Query parameter "name" is required.', 400, 'Example: /api/dns/dnssec?name=cloudflare.com&type=DNSKEY');
  }

  try {
    const data = await lookupDns(name, type, 'cloudflare');
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'DNSSEC lookup failed', 500);
  }
});

dnsRouter.get('/reverse', async (c) => {
  const ip = c.req.query('ip');
  if (!ip) {
    return jsonError(c, 'Query parameter "ip" is required.', 400, 'Example: /api/dns/reverse?ip=8.8.8.8');
  }

  try {
    const data = await lookupReverseDns(ip);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Reverse DNS lookup failed', 500);
  }
});

dnsRouter.get('/propagation', async (c) => {
  const domain = c.req.query('domain') || c.req.query('name');
  const type = c.req.query('type') || 'A';

  if (!domain) {
    return jsonError(c, 'Query parameter "domain" is required.', 400, 'Example: /api/dns/propagation?domain=google.com&type=A');
  }

  try {
    const data = await checkDnsPropagation(domain, type);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'DNS propagation check failed', 500);
  }
});
