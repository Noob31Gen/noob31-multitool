async function testSources() {
  console.log('Testing candidate server-to-server sources...\n');

  // 1. EPSS First.org
  try {
    const res = await fetch('https://api.first.org/data/v1/epss?cve=CVE-2021-44228', { signal: AbortSignal.timeout(4000) });
    console.log('EPSS Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('EPSS Sample:', JSON.stringify(data).slice(0, 120));
    }
  } catch (e) {
    console.log('EPSS Error:', (e as Error).message);
  }

  // 2. CISA KEV
  try {
    const res = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', { signal: AbortSignal.timeout(5000) });
    console.log('CISA KEV Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { count?: number; vulnerabilities?: unknown[] };
      console.log('CISA KEV Vulnerabilities Count:', data.count || (data.vulnerabilities && data.vulnerabilities.length));
    }
  } catch (e) {
    console.log('CISA KEV Error:', (e as Error).message);
  }

  // 3. IPAPI.is
  try {
    const res = await fetch('https://api.ipapi.is/?q=8.8.8.8', { signal: AbortSignal.timeout(4000) });
    console.log('IPAPI.is Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { is_datacenter?: boolean; is_vpn?: boolean; company?: { name: string } };
      console.log('IPAPI.is Sample:', data.company?.name, 'is_datacenter:', data.is_datacenter);
    }
  } catch (e) {
    console.log('IPAPI.is Error:', (e as Error).message);
  }

  // 4. IP2C
  try {
    const res = await fetch('https://ip2c.org/8.8.8.8', { signal: AbortSignal.timeout(4000) });
    console.log('IP2C Status:', res.status);
    if (res.ok) {
      const text = await res.text();
      console.log('IP2C Sample:', text);
    }
  } catch (e) {
    console.log('IP2C Error:', (e as Error).message);
  }

  // 5. Troubleshooting.tools MAC Lookup
  try {
    const res = await fetch('https://api.troubleshooting.tools/lookup/mac/001122', { signal: AbortSignal.timeout(4000) });
    console.log('Troubleshooting.tools Status:', res.status);
    if (res.ok) {
      const text = await res.text();
      console.log('Troubleshooting.tools Sample:', text.trim());
    }
  } catch (e) {
    console.log('Troubleshooting.tools Error:', (e as Error).message);
  }

  // 6. RapidDNS Subdomain scraping
  try {
    const res = await fetch('https://rapiddns.io/subdomain/google.com?full=1', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(5000)
    });
    console.log('RapidDNS Status:', res.status);
    if (res.ok) {
      const text = await res.text();
      const matches = text.match(/<td>([a-zA-Z0-9.-]+\.google\.com)<\/td>/g);
      console.log('RapidDNS Subdomains matched count:', matches ? matches.length : 0);
    }
  } catch (e) {
    console.log('RapidDNS Error:', (e as Error).message);
  }

  // 7. Quad9 DoH
  try {
    const res = await fetch('https://dns.quad9.net/dns-query?name=google.com&type=A', {
      headers: { 'Accept': 'application/dns-json' },
      signal: AbortSignal.timeout(4000)
    });
    console.log('Quad9 DoH Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { Answer?: { data: string }[] };
      console.log('Quad9 Answer:', data.Answer?.map(a => a.data));
    }
  } catch (e) {
    console.log('Quad9 Error:', (e as Error).message);
  }

  // 8. Control D DoH
  try {
    const res = await fetch('https://freedns.controld.com/p0?name=google.com&type=A', {
      headers: { 'Accept': 'application/dns-json' },
      signal: AbortSignal.timeout(4000)
    });
    console.log('Control D DoH Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { Answer?: { data: string }[] };
      console.log('Control D Answer:', data.Answer?.map(a => a.data));
    }
  } catch (e) {
    console.log('Control D Error:', (e as Error).message);
  }

  // 9. URLhaus API (abuse.ch)
  try {
    const body = new URLSearchParams({ host: 'google.com' });
    const res = await fetch('https://urlhaus-api.abuse.ch/v1/host/', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(4000)
    });
    console.log('URLhaus Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { query_status?: string; urls?: unknown[] };
      console.log('URLhaus query_status:', data.query_status, 'urls count:', data.urls ? data.urls.length : 0);
    }
  } catch (e) {
    console.log('URLhaus Error:', (e as Error).message);
  }

  // 10. ThreatFox API (abuse.ch)
  try {
    const res = await fetch('https://threatfox-api.abuse.ch/api/v1/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'search_ioc', search_term: 'google.com' }),
      signal: AbortSignal.timeout(4000)
    });
    console.log('ThreatFox Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { query_status?: string };
      console.log('ThreatFox query_status:', data.query_status);
    }
  } catch (e) {
    console.log('ThreatFox Error:', (e as Error).message);
  }

  // 11. Sucuri SiteCheck
  try {
    const res = await fetch('https://sitecheck.sucuri.net/api/v3/?q=google.com', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000)
    });
    console.log('Sucuri SiteCheck Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { scan?: { site?: string }; ratings?: { total?: { rating?: string } } };
      console.log('Sucuri Sample site:', data.scan?.site, 'rating:', data.ratings?.total?.rating);
    }
  } catch (e) {
    console.log('Sucuri Error:', (e as Error).message);
  }
}

testSources();
