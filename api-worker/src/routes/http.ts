import { Hono } from 'hono';
import { scanUrl } from '../services/httpService';
import { jsonSuccess, jsonError } from '../utils/response';

export const httpRouter = new Hono();

httpRouter.get('/scan', async (c) => {
  const url = c.req.query('url') || c.req.query('target');
  if (!url) {
    return jsonError(c, 'Query parameter "url" is required.', 400, 'Example: /api/http/scan?url=https://example.com');
  }

  try {
    const data = await scanUrl(url);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'URL scan failed', 500);
  }
});

httpRouter.get('/headers', async (c) => {
  const url = c.req.query('url') || c.req.query('target');
  if (!url) {
    return jsonError(c, 'Query parameter "url" is required.', 400, 'Example: /api/http/headers?url=https://example.com');
  }

  try {
    const data = await scanUrl(url);
    return jsonSuccess(c, {
      url: data.url,
      finalUrl: data.finalUrl,
      status: data.status,
      statusText: data.statusText,
      headers: data.headers,
      securityHeaders: data.securityHeaders,
      detectedTechnologies: data.detectedTechnologies,
      responseTimeMs: data.responseTimeMs
    });
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'HTTP headers lookup failed', 500);
  }
});
