import { Buffer } from 'buffer';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// CORS Proxies defined in the application
const PROXIES = [
  { name: 'CorsProxy', getUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}` }
];

async function fetchWithTimeout(url, options = {}, timeout = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function validateSource(name, targetUrl, options = {}, validator) {
  const startTime = Date.now();
  const headers = {
    'User-Agent': USER_AGENT,
    ...(options.headers || {})
  };

  const errors = [];

  // 1. Try Direct fetch
  try {
    const res = await fetchWithTimeout(targetUrl, { ...options, headers }, 7000);
    const text = await res.text();
    if (res.ok) {
      if (validator(text, res)) {
        return {
          name,
          status: '\x1b[32mSUCCESS (Direct)\x1b[0m',
          latency: `${Date.now() - startTime}ms`,
          details: 'Valid response returned directly.'
        };
      } else {
        errors.push(`Direct: Validator failed. Status: ${res.status}`);
      }
    } else {
      errors.push(`Direct: HTTP ${res.status}`);
    }
  } catch (err) {
    errors.push(`Direct error: ${err.message}`);
  }

  // 2. Try Proxies
  for (const proxy of PROXIES) {
    const proxyStartTime = Date.now();
    const proxiedUrl = proxy.getUrl(targetUrl);
    try {
      const res = await fetchWithTimeout(proxiedUrl, { ...options, headers }, 9000);
      const text = await res.text();
      // Inspect AllOrigins wrapper if used
      let parsedText = text;
      if (proxy.name === 'AllOrigins' && text) {
        try {
          const wrapper = JSON.parse(text);
          if (wrapper.contents) parsedText = wrapper.contents;
        } catch { /* ignore */ }
      }

      if (res.ok) {
        if (validator(parsedText, res)) {
          return {
            name,
            status: `\x1b[36mSUCCESS (${proxy.name} Proxy)\x1b[0m`,
            latency: `${Date.now() - proxyStartTime}ms`,
            details: `Valid response resolved through CORS proxy fallback.`
          };
        } else {
          errors.push(`${proxy.name}: Validator failed. Status: ${res.status}`);
        }
      } else {
        errors.push(`${proxy.name}: HTTP ${res.status}`);
      }
    } catch (err) {
      errors.push(`${proxy.name} error: ${err.message}`);
    }
  }

  return {
    name,
    status: '\x1b[31mFAILED\x1b[0m',
    latency: 'N/A',
    details: errors.join(' | ')
  };
}

async function run() {
  console.log('\n\x1b[1m==================================================');
  console.log('       LOOKUP SOURCES VALIDATION UTILITY');
  console.log('==================================================\x1b[0m\n');
  console.log(`Using User-Agent: "${USER_AGENT}"\n`);

  const tests = [
    // --- DoH Endpoints ---
    {
      name: 'Google DoH Resolve',
      url: 'https://dns.google/resolve?name=google.com&type=A',
      validator: (t) => {
        const d = JSON.parse(t);
        return d.Status === 0 && Array.isArray(d.Answer);
      }
    },
    {
      name: 'Cloudflare DoH Query',
      url: 'https://cloudflare-dns.com/dns-query?name=google.com&type=A',
      options: { headers: { 'Accept': 'application/dns-json' } },
      validator: (t) => {
        const d = JSON.parse(t);
        return d.Status === 0 && Array.isArray(d.Answer);
      }
    },
    {
      name: 'AliDNS DoH Resolve',
      url: 'https://dns.alidns.com/resolve?name=google.com&type=A',
      validator: (t) => {
        const d = JSON.parse(t);
        return d.Status === 0 && Array.isArray(d.Answer);
      }
    },
    {
      name: 'AdGuard DoH Query',
      url: 'https://dns.adguard-dns.com/dns-query?name=google.com&type=A',
      options: { headers: { 'Accept': 'application/dns-json' } },
      validator: (t, res) => res.status === 200 || res.status === 400
    },

    // --- CORS Proxies check ---
    {
      name: 'CORS Proxy CorsProxy',
      url: 'https://corsproxy.io/?https://example.com',
      validator: (t) => t.toLowerCase().includes('<!doctype html>') || t.includes('Example Domain')
    },

    // --- Subdomains & Certificates ---
    {
      name: 'HackerTarget Hostsearch',
      url: 'https://api.hackertarget.com/hostsearch/?q=google.com',
      validator: (t) => t.includes('google.com') && t.includes('.')
    },
    {
      name: 'URLScan.io Search',
      url: 'https://urlscan.io/api/v1/search/?q=domain:google.com&size=1',
      validator: (t) => Array.isArray(JSON.parse(t).results)
    },
    {
      name: 'crt.sh CT Search',
      url: 'https://crt.sh/?q=google.com&output=json',
      validator: (t) => Array.isArray(JSON.parse(t))
    },
    {
      name: 'crt.name CT Search',
      url: 'https://crt.name/v1/search?apex=google.com',
      validator: (t) => t.includes('google.com') && t.includes('.')
    },
    {
      name: 'CertSpotter issuances',
      url: 'https://api.certspotter.com/v1/issuances?domain=google.com&include_subdomains=true&expand=dns_names&limit=2',
      validator: (t) => Array.isArray(JSON.parse(t))
    },
    {
      name: 'Anubis Subdomains',
      url: 'https://jldc.me/anubis/subdomains/google.com',
      validator: (t) => Array.isArray(JSON.parse(t))
    },
    {
      name: 'Mnemonic PDNS v3',
      url: 'https://api.mnemonic.no/pdns/v3/google.com',
      validator: (t) => Array.isArray(JSON.parse(t).data)
    },
    {
      name: 'Wayback Machine CDX',
      url: 'http://web.archive.org/cdx/search/cdx?url=*.google.com/*&output=json&collapse=urlkey&limit=2',
      validator: (t) => Array.isArray(JSON.parse(t))
    },
    {
      name: 'AlienVault passive_dns',
      url: 'https://otx.alienvault.com/api/v1/indicators/domain/google.com/passive_dns',
      validator: (t) => Array.isArray(JSON.parse(t).passive_dns)
    },
    {
      name: 'ThreatMiner Subdomains (rt=5)',
      url: 'https://api.threatminer.org/v2/domain.php?q=google.com&rt=5',
      validator: (t) => JSON.parse(t).status_code === '200' && Array.isArray(JSON.parse(t).results)
    },
    {
      name: 'Subdomain Center',
      url: 'https://api.subdomain.center/api4?domain=google.com',
      validator: (t) => Array.isArray(JSON.parse(t))
    },

    // --- Domain Reputation & Threat Intel ---
    {
      name: 'AlienVault indicator info',
      url: 'https://otx.alienvault.com/api/v1/indicators/domain/google.com/general',
      validator: (t) => typeof JSON.parse(t).pulse_info === 'object'
    },
    {
      name: 'ThreatMiner Malware (rt=4)',
      url: 'https://api.threatminer.org/v2/domain.php?q=google.com&rt=4',
      validator: (t) => JSON.parse(t).status_code === '200' && Array.isArray(JSON.parse(t).results)
    },
    {
      name: 'ThreatMiner Sample (rt=1)',
      url: 'https://api.threatminer.org/v2/sample.php?q=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855&rt=1',
      validator: (t) => JSON.parse(t).status_code === '200'
    },
    {
      name: 'PhishStats Feed Query',
      url: 'https://api.phishstats.info/api/phishing?_size=1',
      validator: (t) => Array.isArray(JSON.parse(t))
    },
    {
      name: 'MalwareBazaar Hash Query',
      url: 'https://mb-api.abuse.ch/api/v1/',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'query=get_info&hash=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      },
      validator: (t) => typeof JSON.parse(t).query_status === 'string'
    },

    // --- MAC Address Lookup ---
    {
      name: 'MACVendorLookup',
      url: 'https://www.macvendorlookup.com/api/v2/001122',
      validator: (t) => Array.isArray(JSON.parse(t)) && JSON.parse(t)[0].company !== undefined
    },
    {
      name: 'maclookup.app',
      url: 'https://api.maclookup.app/v2/macs/001122',
      validator: (t) => typeof JSON.parse(t).found === 'boolean'
    },
    {
      name: 'macvendors.com',
      url: 'https://api.macvendors.com/001122',
      validator: (t) => typeof t === 'string' && t.length > 0
    },

    // --- IP & ASN ---
    {
      name: 'ipapi.is GeoIP',
      url: 'https://api.ipapi.is/?q=8.8.8.8',
      validator: (t) => JSON.parse(t).ip !== undefined || JSON.parse(t).is_bogon !== undefined
    },
    {
      name: 'ipwhois.app GeoIP',
      url: 'https://ipwhois.app/json/8.8.8.8',
      validator: (t) => typeof JSON.parse(t).success === 'boolean'
    },
    {
      name: 'ip-api.com GeoIP',
      url: 'http://ip-api.com/json/8.8.8.8',
      validator: (t) => JSON.parse(t).status !== undefined
    },
    {
      name: 'ipapi.co GeoIP',
      url: 'https://ipapi.co/8.8.8.8/json',
      validator: (t) => JSON.parse(t).ip !== undefined || JSON.parse(t).error !== undefined
    },
    {
      name: 'RIPE Stat AS-overview',
      url: 'https://stat.ripe.net/data/as-overview/data.json?resource=AS15169',
      validator: (t) => JSON.parse(t).status === 'ok' && typeof JSON.parse(t).data === 'object'
    },
    {
      name: 'PeeringDB API',
      url: 'https://www.peeringdb.com/api/net?asn=15169',
      validator: (t) => Array.isArray(JSON.parse(t).data)
    },
    {
      name: 'BGPView ASN info',
      url: 'https://api.bgpview.io/asn/15169',
      validator: (t) => JSON.parse(t).status === 'ok'
    },

    // --- WHOIS / RDAP ---
    {
      name: 'rdap.org Domain Redirect',
      url: 'https://rdap.org/domain/google.com',
      validator: (t, res) => res.status === 200 || res.status === 302 || res.status === 301 || t.includes('ldhName')
    },
    {
      name: 'who-dat WHOIS fallback',
      url: 'https://who-dat.as93.net/google.com',
      validator: (t) => typeof JSON.parse(t).isRegistered === 'boolean'
    }
  ];

  // Optional premium endpoints if keys are present in process.env
  const censysId = process.env.CENSYS_API_ID;
  const censysSecret = process.env.CENSYS_API_SECRET;
  if (censysId && censysSecret) {
    tests.push({
      name: 'Censys Certificate Search (Premium)',
      url: 'https://search.censys.io/api/v2/certificates/search?q=parsed.names:google.com&per_page=1',
      options: {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${censysId}:${censysSecret}`).toString('base64')}`
        }
      },
      validator: (t) => {
        const d = JSON.parse(t);
        return d.code === 200 && d.result && Array.isArray(d.result.hits);
      }
    });
  } else {
    console.log('\x1b[33m[!] Skipped Censys premium check (Missing CENSYS_API_ID / CENSYS_API_SECRET)\x1b[0m');
  }

  const safeBrowsingKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (safeBrowsingKey) {
    tests.push({
      name: 'Google Safe Browsing (Premium)',
      url: `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${safeBrowsingKey}`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'source-validator', clientVersion: '1.0.0' },
          threatInfo: {
            threatTypes: ['MALWARE'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url: 'google.com' }]
          }
        })
      },
      validator: (t) => {
        const d = JSON.parse(t);
        return d.matches !== undefined;
      }
    });
  } else {
    console.log('\x1b[33m[!] Skipped Google Safe Browsing premium check (Missing GOOGLE_SAFE_BROWSING_API_KEY)\x1b[0m');
  }

  const vtKey = process.env.VIRUSTOTAL_API_KEY;
  if (vtKey) {
    tests.push({
      name: 'VirusTotal Domain Report (Premium)',
      url: 'https://www.virustotal.com/api/v3/domains/google.com',
      options: {
        headers: { 'x-apikey': vtKey }
      },
      validator: (t) => {
        const d = JSON.parse(t);
        return d.data && d.data.attributes !== undefined;
      }
    });
  } else {
    console.log('\x1b[33m[!] Skipped VirusTotal premium check (Missing VIRUSTOTAL_API_KEY)\x1b[0m\n');
  }

  const results = [];
  for (const test of tests) {
    process.stdout.write(`Testing: ${test.name.padEnd(40)} ... `);
    const result = await validateSource(test.name, test.url, test.options || {}, test.validator);
    console.log(`[${result.status}] (${result.latency})`);
    results.push(result);
  }

  console.log('\n\x1b[1m==================================================');
  console.log('                 SUMMARY REPORT');
  console.log('==================================================\x1b[0m\n');
  let successCount = 0;
  for (const r of results) {
    const isFailed = r.status.includes('FAILED');
    if (!isFailed) successCount++;
    console.log(`- ${r.name.padEnd(35)}: ${r.status} (${r.latency})`);
    if (isFailed) {
      console.log(`    \x1b[31mError Details:\x1b[0m ${r.details}`);
    }
  }
  console.log(`\nPassed sources: ${successCount}/${tests.length}`);
}

run().catch((err) => {
  console.error('\nFatal error running validation script:', err);
  process.exit(1);
});
