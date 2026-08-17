import { Hono } from 'hono';
import { queryRdap } from '../services/rdapService';
import { lookupCompany } from '../services/companyService';

export const rdapRouter = new Hono();

rdapRouter.get('/lookup', async (c) => {
  const query = c.req.query('query') || c.req.query('domain') || c.req.query('ip');
  if (!query) {
    return c.json({ success: false, error: 'Query parameter "query", "domain", or "ip" is required.' }, 400);
  }

  try {
    const data = await queryRdap(query);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'RDAP lookup failed'
    }, 500);
  }
});

rdapRouter.get('/company', async (c) => {
  const query = c.req.query('query') || c.req.query('q');
  if (!query) {
    return c.json({ success: false, error: 'Query parameter "query" is required.' }, 400);
  }

  try {
    const data = await lookupCompany(query);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'Company lookup failed'
    }, 500);
  }
});
