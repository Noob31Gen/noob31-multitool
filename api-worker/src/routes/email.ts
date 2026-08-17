import { Hono } from 'hono';
import { checkEmailAuth, checkEmailDeliverability } from '../services/emailService';

export const emailRouter = new Hono();

emailRouter.get('/auth', async (c) => {
  const domain = c.req.query('domain') || c.req.query('name');
  const selector = c.req.query('selector');

  if (!domain) {
    return c.json({ success: false, error: 'Query parameter "domain" is required.' }, 400);
  }

  try {
    const data = await checkEmailAuth(domain, selector);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'Email authentication lookup failed'
    }, 500);
  }
});

emailRouter.get('/deliverability', async (c) => {
  const domain = c.req.query('domain') || c.req.query('name');
  if (!domain) {
    return c.json({ success: false, error: 'Query parameter "domain" is required.' }, 400);
  }

  try {
    const data = await checkEmailDeliverability(domain);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'Email deliverability check failed'
    }, 500);
  }
});
