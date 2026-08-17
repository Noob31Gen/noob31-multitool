import { Hono } from 'hono';
import { lookupDns, lookupReverseDns } from '../services/dnsService';

export const dnsRouter = new Hono();

dnsRouter.get('/lookup', async (c) => {
  const name = c.req.query('name') || c.req.query('domain');
  const type = c.req.query('type') || 'A';
  const provider = c.req.query('provider') || 'auto';

  if (!name) {
    return c.json({ success: false, error: 'Query parameter "name" or "domain" is required.' }, 400);
  }

  try {
    const data = await lookupDns(name, type, provider);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'DNS lookup failed'
    }, 500);
  }
});

dnsRouter.get('/dnssec', async (c) => {
  const name = c.req.query('name') || c.req.query('domain');
  const type = c.req.query('type') || 'DNSKEY';

  if (!name) {
    return c.json({ success: false, error: 'Query parameter "name" is required.' }, 400);
  }

  try {
    const data = await lookupDns(name, type, 'cloudflare');
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'DNSSEC lookup failed'
    }, 500);
  }
});

dnsRouter.get('/reverse', async (c) => {
  const ip = c.req.query('ip');
  if (!ip) {
    return c.json({ success: false, error: 'Query parameter "ip" is required.' }, 400);
  }

  try {
    const data = await lookupReverseDns(ip);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'Reverse DNS lookup failed'
    }, 500);
  }
});
