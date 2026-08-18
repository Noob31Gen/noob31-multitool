import { Hono } from 'hono';
import { queryRdap } from '../services/rdapService';
import { lookupCompany } from '../services/companyService';
import { jsonSuccess, jsonError } from '../utils/response';

export const rdapRouter = new Hono();

rdapRouter.get('/lookup', async (c) => {
  const query = c.req.query('query') || c.req.query('domain') || c.req.query('ip');
  if (!query) {
    return jsonError(c, 'Query parameter "query", "domain", or "ip" is required.', 400, 'Example: /api/rdap/lookup?query=github.com');
  }

  try {
    const data = await queryRdap(query);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'RDAP lookup failed', 500);
  }
});

rdapRouter.get('/company', async (c) => {
  const query = c.req.query('query') || c.req.query('q');
  if (!query) {
    return jsonError(c, 'Query parameter "query" is required.', 400, 'Example: /api/rdap/company?query=Microsoft');
  }

  try {
    const data = await lookupCompany(query);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Company lookup failed', 500);
  }
});
