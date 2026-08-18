import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { dnsRouter } from './routes/dns';
import { rdapRouter } from './routes/rdap';
import { securityRouter } from './routes/security';
import { networkRouter } from './routes/network';
import { httpRouter } from './routes/http';
import { emailRouter } from './routes/email';
import { toolsRouter } from './routes/tools';
import { openapiRouter } from './routes/openapi';
import { jsonSuccess, jsonError } from './utils/response';

export type AppEnv = {
  Variables: {
    startTime: number;
  };
};

const app = new Hono<AppEnv>();

// Global CORS Middleware - Enables direct frontend access without any CORS proxy
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Server-Timing', 'Content-Length'],
  maxAge: 86400
}));

// Performance Timing Middleware - Records start time for execution calculation
app.use('*', async (c, next) => {
  c.set('startTime', performance.now());
  await next();
});

// Mount OpenAPI Spec & Docs
app.route('/', openapiRouter);

// Root Status & Index
app.get('/', (c) => {
  return jsonSuccess(c, {
    status: 'online',
    service: 'Noob31 MultiTools Cloudflare Worker API',
    version: '1.0.0',
    documentationUrl: '/docs',
    openApiSpec: '/openapi.json',
    endpointCategories: [
      'DNS & DNSSEC (/api/dns/*)',
      'RDAP & WHOIS (/api/rdap/*)',
      'Security & Threats (/api/security/*)',
      'Network & Hardware (/api/network/*)',
      'Web & HTTP (/api/http/*)',
      'Email Diagnostics (/api/email/*)',
      'Utility Tools (/api/tools/*)'
    ]
  });
});

app.get('/health', (c) => {
  return jsonSuccess(c, {
    status: 'ok',
    uptimeMs: performance.now(),
    timestamp: new Date().toISOString()
  });
});

// Mount Routers
app.route('/api/dns', dnsRouter);
app.route('/api/rdap', rdapRouter);
app.route('/api/security', securityRouter);
app.route('/api/network', networkRouter);
app.route('/api/http', httpRouter);
app.route('/api/url', httpRouter);
app.route('/api/email', emailRouter);
app.route('/api/tools', toolsRouter);

// Standardized 404 Handler
app.notFound((c) => {
  return jsonError(
    c,
    `Endpoint not found: ${c.req.method} ${c.req.path}`,
    404,
    'Visit /docs for the interactive API reference or /openapi.json for the full specification.'
  );
});

// Standardized Global Error Handler
app.onError((err, c) => {
  console.error('[Worker Error]', err);
  return jsonError(
    c,
    err.message || 'Internal Server Error',
    500,
    'An unexpected error occurred while executing the diagnostic query.'
  );
});

export default app;
