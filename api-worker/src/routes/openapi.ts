import { Hono } from 'hono';

export const openapiRouter = new Hono();

const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'Noob31 MultiTools High-Performance Worker API',
    version: '1.0.0',
    description: 'A comprehensive, sub-10ms capable server-to-server network diagnostics, domain health, email authentication, and security threat intelligence REST API built on Cloudflare Workers.',
    contact: {
      name: 'Noob31',
      url: 'https://tools.noob31.com'
    },
    license: {
      name: 'GNU AGPL v3.0',
      url: 'https://www.gnu.org/licenses/agpl-3.0.html'
    }
  },
  servers: [
    {
      url: 'https://api.tools.noob31.com',
      description: 'Production Cloudflare Worker'
    },
    {
      url: 'http://localhost:8787',
      description: 'Local Development Server'
    }
  ],
  tags: [
    { name: 'DNS & DNSSEC', description: 'DNS-over-HTTPS lookups, DNSSEC validation, and reverse DNS' },
    { name: 'RDAP & WHOIS', description: 'Domain and IP registration data from direct RIRs' },
    { name: 'Security & Threats', description: 'AlienVault OTX, URLScan, Shodan InternetDB, Blocklist.de, CVEs, and reputation' },
    { name: 'Network & Hardware', description: 'Subdomain discovery, GeoIP, ASN routing, and MAC address OUI' },
    { name: 'Web & HTTP', description: 'HTTP redirect chains, response headers, and security headers grading' },
    { name: 'Email Diagnostics', description: 'SPF, DMARC, DKIM records, deliverability tests, and header parsing' },
    { name: 'Utility Tools', description: 'CIDR subnet calculator, cryptographic hash analyzer, and propagation checks' }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Worker health check',
        responses: { '200': { description: 'API is healthy' } }
      }
    },
    '/api/dns/lookup': {
      get: {
        tags: ['DNS & DNSSEC'],
        summary: 'Resolve DNS records via multi-provider DoH',
        parameters: [
          { name: 'name', in: 'query', required: true, schema: { type: 'string' }, example: 'google.com' },
          { name: 'type', in: 'query', schema: { type: 'string', default: 'A' }, example: 'A' },
          { name: 'provider', in: 'query', schema: { type: 'string', default: 'auto' }, example: 'auto' }
        ],
        responses: { '200': { description: 'DNS resolution result' } }
      }
    },
    '/api/dns/dnssec': {
      get: {
        tags: ['DNS & DNSSEC'],
        summary: 'Inspect DNSSEC keys & signatures',
        parameters: [
          { name: 'name', in: 'query', required: true, schema: { type: 'string' }, example: 'cloudflare.com' },
          { name: 'type', in: 'query', schema: { type: 'string', default: 'DNSKEY' } }
        ],
        responses: { '200': { description: 'DNSSEC records' } }
      }
    },
    '/api/dns/reverse': {
      get: {
        tags: ['DNS & DNSSEC'],
        summary: 'Reverse DNS (PTR) lookup for IPv4/IPv6',
        parameters: [
          { name: 'ip', in: 'query', required: true, schema: { type: 'string' }, example: '8.8.8.8' }
        ],
        responses: { '200': { description: 'PTR records' } }
      }
    },
    '/api/dns/propagation': {
      get: {
        tags: ['DNS & DNSSEC', 'Utility Tools'],
        summary: 'Check global DNS propagation across worldwide resolvers',
        parameters: [
          { name: 'domain', in: 'query', required: true, schema: { type: 'string' }, example: 'google.com' },
          { name: 'type', in: 'query', schema: { type: 'string', default: 'A' } }
        ],
        responses: { '200': { description: 'Multi-resolver propagation report' } }
      }
    },
    '/api/rdap/lookup': {
      get: {
        tags: ['RDAP & WHOIS'],
        summary: 'Query domain or IP registration data with direct RIR fallback',
        parameters: [
          { name: 'query', in: 'query', required: true, schema: { type: 'string' }, example: 'github.com' }
        ],
        responses: { '200': { description: 'Standardized RDAP data' } }
      }
    },
    '/api/rdap/company': {
      get: {
        tags: ['RDAP & WHOIS'],
        summary: 'Search company profile, ticker, and CIK number via SEC EDGAR and Clearbit',
        parameters: [
          { name: 'query', in: 'query', required: true, schema: { type: 'string' }, example: 'Microsoft' }
        ],
        responses: { '200': { description: 'Matching company entities' } }
      }
    },
    '/api/security/threat-intel': {
      get: {
        tags: ['Security & Threats'],
        summary: 'Aggregate threat intelligence from OTX, URLScan, InternetDB, and Blocklist.de',
        parameters: [
          { name: 'query', in: 'query', required: true, schema: { type: 'string' }, example: 'example.com' }
        ],
        responses: { '200': { description: 'Aggregated threat intelligence' } }
      }
    },
    '/api/security/cve': {
      get: {
        tags: ['Security & Threats'],
        summary: 'Query vulnerability details with First.org EPSS and CISA KEV catalog check',
        parameters: [
          { name: 'cve', in: 'query', required: true, schema: { type: 'string' }, example: 'CVE-2021-44228' }
        ],
        responses: { '200': { description: 'CVE vulnerability intelligence' } }
      }
    },
    '/api/security/blacklist': {
      get: {
        tags: ['Security & Threats'],
        summary: 'Scan IP address across 7 major DNSBL anti-spam lists',
        parameters: [
          { name: 'target', in: 'query', required: true, schema: { type: 'string' }, example: '148.228.16.3' }
        ],
        responses: { '200': { description: 'Blacklist check result' } }
      }
    },
    '/api/security/reputation': {
      get: {
        tags: ['Security & Threats'],
        summary: 'Multi-vector domain/IP reputation scoring and risk evaluation',
        parameters: [
          { name: 'target', in: 'query', required: true, schema: { type: 'string' }, example: 'example.com' }
        ],
        responses: { '200': { description: 'Domain reputation report' } }
      }
    },
    '/api/security/cert': {
      get: {
        tags: ['Security & Threats'],
        summary: 'Historical SSL/TLS Certificate Transparency logs via crt.sh & CertSpotter',
        parameters: [
          { name: 'domain', in: 'query', required: true, schema: { type: 'string' }, example: 'google.com' }
        ],
        responses: { '200': { description: 'Certificate Transparency records' } }
      }
    },
    '/api/security/typosquat': {
      get: {
        tags: ['Security & Threats'],
        summary: 'Detect typosquatting, bit-squatting, and homoglyph domain registrations',
        parameters: [
          { name: 'domain', in: 'query', required: true, schema: { type: 'string' }, example: 'google.com' }
        ],
        responses: { '200': { description: 'Typosquatting permutation analysis' } }
      }
    },
    '/api/network/subdomains': {
      get: {
        tags: ['Network & Hardware'],
        summary: 'Enumerate subdomains from 6 sources (HackerTarget, crt.sh, CertSpotter, RapidDNS, Mnemonic, URLScan)',
        parameters: [
          { name: 'domain', in: 'query', required: true, schema: { type: 'string' }, example: 'google.com' }
        ],
        responses: { '200': { description: 'Discovered subdomains list' } }
      }
    },
    '/api/network/my-ip': {
      get: {
        tags: ['Network & Hardware'],
        summary: 'Get client IP, Cloudflare edge datacenter context, ASN, and Geolocation',
        responses: { '200': { description: 'Client IP information' } }
      }
    },
    '/api/network/geoip': {
      get: {
        tags: ['Network & Hardware'],
        summary: 'IP Geolocation, ISP, Datacenter/VPN/Tor detection, and abuse contacts',
        parameters: [
          { name: 'ip', in: 'query', required: true, schema: { type: 'string' }, example: '8.8.8.8' }
        ],
        responses: { '200': { description: 'GeoIP intelligence' } }
      }
    },
    '/api/network/asn': {
      get: {
        tags: ['Network & Hardware'],
        summary: 'ASN ownership, BGP routing origins, and PeeringDB peering exchanges',
        parameters: [
          { name: 'asn', in: 'query', schema: { type: 'string' }, example: '15169' },
          { name: 'ip', in: 'query', schema: { type: 'string' }, example: '8.8.8.8' }
        ],
        responses: { '200': { description: 'ASN details' } }
      }
    },
    '/api/network/mac': {
      get: {
        tags: ['Network & Hardware'],
        summary: 'MAC address OUI vendor lookup with 4-tier cascade',
        parameters: [
          { name: 'mac', in: 'query', required: true, schema: { type: 'string' }, example: '00:11:22:33:44:55' }
        ],
        responses: { '200': { description: 'MAC hardware vendor' } }
      }
    },
    '/api/http/scan': {
      get: {
        tags: ['Web & HTTP'],
        summary: 'Trace HTTP redirect chains, headers, and security headers grading',
        parameters: [
          { name: 'url', in: 'query', required: true, schema: { type: 'string' }, example: 'https://google.com' }
        ],
        responses: { '200': { description: 'URL scan report' } }
      }
    },
    '/api/email/auth': {
      get: {
        tags: ['Email Diagnostics'],
        summary: 'Inspect SPF, DMARC, and DKIM DNS authentication records',
        parameters: [
          { name: 'domain', in: 'query', required: true, schema: { type: 'string' }, example: 'google.com' },
          { name: 'selector', in: 'query', schema: { type: 'string' } }
        ],
        responses: { '200': { description: 'Email authentication results' } }
      }
    },
    '/api/email/deliverability': {
      get: {
        tags: ['Email Diagnostics'],
        summary: 'Email deliverability and spam prevention grading (A+ to F)',
        parameters: [
          { name: 'domain', in: 'query', required: true, schema: { type: 'string' }, example: 'google.com' }
        ],
        responses: { '200': { description: 'Deliverability score' } }
      }
    },
    '/api/email/parse-headers': {
      post: {
        tags: ['Email Diagnostics'],
        summary: 'Parse raw email headers, relay hops, and hop-by-hop latency',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  headers: { type: 'string' }
                },
                required: ['headers']
              }
            }
          }
        },
        responses: { '200': { description: 'Parsed email header telemetry' } }
      }
    },
    '/api/tools/subnet': {
      get: {
        tags: ['Utility Tools'],
        summary: 'IPv4 / IPv6 CIDR subnet calculator',
        parameters: [
          { name: 'cidr', in: 'query', required: true, schema: { type: 'string' }, example: '192.168.1.0/24' }
        ],
        responses: { '200': { description: 'Subnet network math' } }
      }
    },
    '/api/tools/hash': {
      get: {
        tags: ['Utility Tools'],
        summary: 'Cryptographic hash identifier & multi-algorithm hash generator (SHA-1, SHA-256, SHA-384, SHA-512)',
        parameters: [
          { name: 'input', in: 'query', required: true, schema: { type: 'string' }, example: 'hello world' }
        ],
        responses: { '200': { description: 'Hash results' } }
      }
    }
  }
};

openapiRouter.get('/openapi.json', (c) => {
  return c.json(OPENAPI_SPEC);
});

// Interactive Scalar / Swagger API Reference UI
openapiRouter.get('/docs', (c) => {
  const html = `<!doctype html>
<html>
  <head>
    <title>MultiTools Worker API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="https://tools.noob31.com/favicon.svg" />
  </head>
  <body>
    <script id="api-reference" data-url="/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

  return c.html(html);
});
