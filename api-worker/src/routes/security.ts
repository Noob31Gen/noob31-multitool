import { Hono } from 'hono';
import { aggregateThreatIntel } from '../services/threatService';
import { lookupCertificates } from '../services/certService';
import { checkBlacklist, checkDomainReputation } from '../services/reputationService';
import { lookupCve } from '../services/cveService';

export const securityRouter = new Hono();

securityRouter.get('/threat-intel', async (c) => {
  const query = c.req.query('query') || c.req.query('q') || c.req.query('target');
  if (!query) {
    return c.json({ success: false, error: 'Query parameter "query" is required.' }, 400);
  }

  try {
    const data = await aggregateThreatIntel(query);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'Threat intelligence aggregation failed'
    }, 500);
  }
});

securityRouter.get('/cert', async (c) => {
  const domain = c.req.query('domain') || c.req.query('name');
  if (!domain) {
    return c.json({ success: false, error: 'Query parameter "domain" is required.' }, 400);
  }

  try {
    const data = await lookupCertificates(domain);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'Certificate lookup failed'
    }, 500);
  }
});

securityRouter.get('/blacklist', async (c) => {
  const target = c.req.query('target') || c.req.query('ip');
  if (!target) {
    return c.json({ success: false, error: 'Query parameter "target" or "ip" is required.' }, 400);
  }

  try {
    const data = await checkBlacklist(target);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'Blacklist check failed'
    }, 500);
  }
});

securityRouter.get('/reputation', async (c) => {
  const target = c.req.query('target') || c.req.query('domain') || c.req.query('ip');
  if (!target) {
    return c.json({ success: false, error: 'Query parameter "target" is required.' }, 400);
  }

  try {
    const data = await checkDomainReputation(target);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'Reputation check failed'
    }, 500);
  }
});

securityRouter.get('/cve', async (c) => {
  const cve = c.req.query('cve') || c.req.query('id');
  if (!cve) {
    return c.json({ success: false, error: 'Query parameter "cve" or "id" is required.' }, 400);
  }

  try {
    const data = await lookupCve(cve);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'CVE lookup failed'
    }, 500);
  }
});
