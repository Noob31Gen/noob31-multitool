// Noob31's MultiTools Helper Background Service Worker
// Production Security Policy: Strictly enforces allowed origins, domain whitelist filtering, and domain-salted SHA-256 Auth

const ALLOWED_ORIGINS = [
  'https://tools.noob31.com',
  'http://localhost',
  'http://127.0.0.1'
];

// Comprehensive Built-in Outbound Domain Whitelist
// Sourced from MultiTools active codebase, verified sources catalog, and Credits & Data Sources
const BUILTIN_ALLOWED_DOMAINS = [
  // DNS & DoH Resolvers
  'dns.google',
  'cloudflare-dns.com',
  'dns.alidns.com',
  'dns.adguard-dns.com',
  'dns.quad9.net',
  'doh.opendns.com',
  'data.iana.org',

  // Subdomain Enumeration & Certificate Transparency
  'crt.name',
  'crt.sh',
  'api.certspotter.com',
  'certspotter.com',
  'api.mnemonic.no',
  'mnemonic.no',
  'api.hackertarget.com',
  'hackertarget.com',
  'rapiddns.io',
  'otx.alienvault.com',
  'alienvault.com',
  'urlscan.io',

  // WHOIS & RDAP Registries
  'rdap.org',
  'rdap.arin.net',
  'arin.net',
  'rdap.db.ripe.net',
  'stat.ripe.net',
  'ripe.net',
  'rdap.apnic.net',
  'apnic.net',
  'rdap.lacnic.net',
  'lacnic.net',
  'rdap.afrinic.net',
  'afrinic.net',
  'who-dat.as93.net',

  // IP, BGP & Geolocation Providers
  'api.ipapi.is',
  'ipapi.is',
  'ipwhois.app',
  'ip-api.com',
  'freeipapi.com',
  'ip.guide',
  'api.iplocation.net',
  'iplocation.net',
  'ip2c.org',
  'wtfismyip.com',
  'peeringdb.com',
  'www.peeringdb.com',
  'ipapi.co',
  'api.bgpview.io',
  'bgpview.io',

  // Threat Intelligence, Reputation & CVE
  'internetdb.shodan.io',
  'cvedb.shodan.io',
  'geonet.shodan.io',
  'entitydb.shodan.io',
  'shodan.io',
  'cve.circl.lu',
  'circl.lu',
  'api.osv.dev',
  'osv.dev',
  'www.cisa.gov',
  'cisa.gov',
  'api.blocklist.de',
  'blocklist.de',
  'api.stopforumspam.org',
  'stopforumspam.com',
  'sitecheck.sucuri.net',
  'sucuri.net',

  // Corporate & Entity Intelligence
  'autocomplete.clearbit.com',
  'clearbit.com',
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'data.sec.gov',
  'sec.gov',

  // MAC Address Vendor Lookups
  'api.troubleshooting.tools',
  'troubleshooting.tools',
  'www.macvendorlookup.com',
  'macvendorlookup.com',
  'api.maclookup.app',
  'maclookup.app',
  'api.macvendors.com',
  'macvendors.com'
];

function isAllowedOrigin(sender) {
  const senderUrl = sender.url || '';
  if (!senderUrl) return false;
  try {
    const u = new URL(senderUrl);
    const origin = u.origin;
    return ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.startsWith(allowed + ':'));
  } catch {
    return false;
  }
}

function isDomainPermitted(hostname, customDomains = [], allowAll = false) {
  if (allowAll) return true;

  const targetHost = hostname.toLowerCase();
  const allAllowed = [...BUILTIN_ALLOWED_DOMAINS, ...customDomains].map(d => d.toLowerCase().trim()).filter(Boolean);

  for (const allowed of allAllowed) {
    if (targetHost === allowed) return true;
    if (targetHost.endsWith('.' + allowed)) return true;
  }

  return false;
}

function handleMessage(request, sender, sendResponse) {
  if (!request) return;

  // 1. INBOUND SENDER ORIGIN CHECK
  if (!isAllowedOrigin(sender)) {
    console.warn(`[MultiTools Security Alert] Request rejected from unauthorized origin: "${sender.url}"`);
    sendResponse({
      success: false,
      error: `Access Denied: Extension strictly exchanges data with https://tools.noob31.com and localhost.`
    });
    return true;
  }

  // Retrieve stored settings & SHA-256 auth hash from chrome.storage.local
  chrome.storage.local.get(['extension_auth_hash', 'custom_allowed_domains', 'allow_all_targets'], (res) => {
    const storedHash = res.extension_auth_hash;
    const customDomains = res.custom_allowed_domains || [];
    const allowAll = !!res.allow_all_targets;

    // Verify Password Auth if configured
    if (storedHash) {
      if (!request.authHash || request.authHash !== storedHash) {
        sendResponse({
          success: false,
          error: 'AUTH_FAILED',
          message: 'Authentication failed: Invalid or missing security password hash. Please configure password in site & extension settings.'
        });
        return;
      }
    }

    // 2. HANDSHAKE PING
    if (request.type === 'PING') {
      sendResponse({
        pong: true,
        version: '1.0.0',
        allowedOrigins: ALLOWED_ORIGINS,
        authRequired: !!storedHash,
        authenticated: true,
        allowAllTargets: allowAll,
        domainWhitelistCount: BUILTIN_ALLOWED_DOMAINS.length + customDomains.length
      });
      return;
    }

    // 3. SECURE CORS-BYPASS FETCH WITH DOMAIN FILTER
    if (request.type === 'FETCH_PROXY') {
      const { url, options } = request;

      let parsedTargetUrl;
      try {
        parsedTargetUrl = new URL(url);
        if (parsedTargetUrl.protocol !== 'http:' && parsedTargetUrl.protocol !== 'https:') {
          sendResponse({
            success: false,
            error: `Blocked target URL scheme: "${parsedTargetUrl.protocol}". Only http: and https: protocols are permitted.`
          });
          return;
        }
      } catch {
        sendResponse({
          success: false,
          error: `Invalid target URL provided: "${url}"`
        });
        return;
      }

      // OUTBOUND DOMAIN WHITELIST FILTER CHECK
      const targetHost = parsedTargetUrl.hostname;
      if (!isDomainPermitted(targetHost, customDomains, allowAll)) {
        console.warn(`[MultiTools Filter Alert] Outbound fetch blocked to unlisted domain: "${targetHost}"`);
        sendResponse({
          success: false,
          error: 'DOMAIN_BLOCKED',
          message: `Outbound request to domain "${targetHost}" is blocked by extension domain filter policy. You can add it in Extension Settings.`
        });
        return;
      }

      // EXECUTE NATIVE BROWSER FETCH
      fetch(url, options || {})
        .then(async (response) => {
          const contentType = response.headers.get('content-type') || '';
          let data;

          if (contentType.includes('application/json') || contentType.includes('application/dns-json') || contentType.includes('application/rdap+json')) {
            try {
              data = await response.json();
            } catch {
              data = await response.text();
            }
          } else {
            data = await response.text();
          }

          // Serialize response headers
          const responseHeaders = {};
          response.headers.forEach((val, key) => {
            responseHeaders[key] = val;
          });

          sendResponse({
            success: true,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            contentType: contentType,
            headers: responseHeaders,
            data: data
          });
        })
        .catch((error) => {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Fetch request failed'
          });
        });
    }
  });

  return true; // Keep channel open for async chrome.storage.local callback
}

// Handle messages from Content Script Bridge
chrome.runtime.onMessage.addListener(handleMessage);

// Handle messages from Externally Connectable Pages
chrome.runtime.onMessageExternal.addListener(handleMessage);
