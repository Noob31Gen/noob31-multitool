import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { dnsRouter } from './routes/dns';
import { rdapRouter } from './routes/rdap';
import { securityRouter } from './routes/security';
import { networkRouter } from './routes/network';
import { httpRouter } from './routes/http';
import { emailRouter } from './routes/email';

const app = new Hono();

// Global CORS Middleware - Enables direct frontend access without any CORS proxy
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Server-Timing', 'Content-Length'],
  maxAge: 86400
}));

// Performance Timing Middleware
app.use('*', async (c, next) => {
  const start = performance.now();
  await next();
  const duration = Math.round(performance.now() - start);
  c.header('Server-Timing', `total;dur=${duration}`);
});

// Root & Health Status
app.get('/', (c) => {
  return c.json({
    status: 'online',
    service: 'Noob31 MultiTools Cloudflare Worker API',
    version: '1.0.0',
    documentation: '/docs',
    endpoints: {
      health: '/health',
      dns: {
        lookup: '/api/dns/lookup?name=example.com&type=A&provider=google',
        dnssec: '/api/dns/dnssec?name=example.com',
        reverse: '/api/dns/reverse?ip=8.8.8.8'
      },
      rdap: {
        lookup: '/api/rdap/lookup?query=example.com',
        company: '/api/rdap/company?query=Microsoft'
      },
      security: {
        threatIntel: '/api/security/threat-intel?query=example.com',
        cert: '/api/security/cert?domain=example.com',
        blacklist: '/api/security/blacklist?target=1.1.1.1',
        reputation: '/api/security/reputation?target=example.com',
        cve: '/api/security/cve?cve=CVE-2024-1234'
      },
      network: {
        subdomains: '/api/network/subdomains?domain=example.com',
        myIp: '/api/network/my-ip',
        geoip: '/api/network/geoip?ip=8.8.8.8',
        asn: '/api/network/asn?asn=15169',
        mac: '/api/network/mac?mac=00:11:22:33:44:55'
      },
      http: {
        scan: '/api/http/scan?url=https://example.com',
        headers: '/api/http/headers?url=https://example.com'
      },
      email: {
        auth: '/api/email/auth?domain=example.com',
        deliverability: '/api/email/deliverability?domain=example.com'
      }
    }
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: performance.now()
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

// 404 Handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: `Endpoint not found: ${c.req.method} ${c.req.path}. Visit / for the full API documentation.`
  }, 404);
});

// Global Error Handler
app.onError((err, c) => {
  console.error('[Worker Error]', err);
  return c.json({
    success: false,
    error: err.message || 'Internal Server Error'
  }, 500);
});

export default app;
