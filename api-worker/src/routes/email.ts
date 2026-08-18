import { Hono } from 'hono';
import { checkEmailAuth, checkEmailDeliverability } from '../services/emailService';
import { parseRawEmailHeaders } from '../services/emailHeaderService';
import { jsonSuccess, jsonError } from '../utils/response';

export const emailRouter = new Hono();

emailRouter.get('/auth', async (c) => {
  const domain = c.req.query('domain') || c.req.query('name');
  const selector = c.req.query('selector');

  if (!domain) {
    return jsonError(c, 'Query parameter "domain" is required.', 400, 'Example: /api/email/auth?domain=google.com&selector=default');
  }

  try {
    const data = await checkEmailAuth(domain, selector);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Email authentication lookup failed', 500);
  }
});

emailRouter.get('/deliverability', async (c) => {
  const domain = c.req.query('domain') || c.req.query('name');
  if (!domain) {
    return jsonError(c, 'Query parameter "domain" is required.', 400, 'Example: /api/email/deliverability?domain=google.com');
  }

  try {
    const data = await checkEmailDeliverability(domain);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Email deliverability check failed', 500);
  }
});

emailRouter.post('/parse-headers', async (c) => {
  try {
    const body = await c.req.json<{ headers?: string }>();
    if (!body?.headers) {
      return jsonError(c, 'JSON body with field "headers" is required.', 400, 'Example: { "headers": "Received: from ...\\nSubject: Test" }');
    }
    const data = parseRawEmailHeaders(body.headers);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Failed to parse email headers', 400);
  }
});

emailRouter.get('/parse-headers', (c) => {
  const raw = c.req.query('raw') || c.req.query('headers');
  if (!raw) {
    return jsonError(c, 'Query parameter "raw" or POST JSON body is required.', 400);
  }
  try {
    const data = parseRawEmailHeaders(raw);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Failed to parse email headers', 400);
  }
});
