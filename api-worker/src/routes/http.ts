import { Hono } from 'hono';
import { scanUrl } from '../services/httpService';

export const httpRouter = new Hono();

httpRouter.get('/scan', async (c) => {
  const url = c.req.query('url') || c.req.query('target');
  if (!url) {
    return c.json({ success: false, error: 'Query parameter "url" is required.' }, 400);
  }

  try {
    const data = await scanUrl(url);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'URL scan failed'
    }, 500);
  }
});

httpRouter.get('/headers', async (c) => {
  const url = c.req.query('url') || c.req.query('target');
  if (!url) {
    return c.json({ success: false, error: 'Query parameter "url" is required.' }, 400);
  }

  try {
    const data = await scanUrl(url);
    return c.json({
      success: true,
      data: {
        url: data.url,
        finalUrl: data.finalUrl,
        status: data.status,
        statusText: data.statusText,
        headers: data.headers,
        securityHeaders: data.securityHeaders,
        responseTimeMs: data.responseTimeMs
      }
    });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'HTTP headers lookup failed'
    }, 500);
  }
});
