async function testMoreSources() {
  console.log('Testing 2nd batch of candidate sources...\n');

  // 1. IPLocation.net
  try {
    const res = await fetch('https://api.iplocation.net/?ip=8.8.8.8', { signal: AbortSignal.timeout(4000) });
    console.log('IPLocation.net Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { country_name?: string; isp?: string };
      console.log('IPLocation.net Sample:', data.country_name, data.isp);
    }
  } catch (e) {
    console.log('IPLocation.net Error:', (e as Error).message);
  }

  // 2. RIPE Stat Routing Status for IP
  try {
    const res = await fetch('https://stat.ripe.net/data/routing-status/data.json?resource=8.8.8.8', { signal: AbortSignal.timeout(4000) });
    console.log('RIPE Routing Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { data?: { origins?: string[]; first_seen?: { time: string } } };
      console.log('RIPE Routing Origins:', data.data?.origins);
    }
  } catch (e) {
    console.log('RIPE Routing Error:', (e as Error).message);
  }

  // 3. URLScan.io Subdomain Search
  try {
    const res = await fetch('https://urlscan.io/api/v1/search/?q=domain:google.com&size=20', { signal: AbortSignal.timeout(4000) });
    console.log('URLScan.io Search Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { results?: { page?: { domain?: string } }[] };
      const domains = Array.from(new Set((data.results || []).map(r => r.page?.domain).filter(Boolean)));
      console.log('URLScan.io Domains found:', domains.slice(0, 5));
    }
  } catch (e) {
    console.log('URLScan.io Search Error:', (e as Error).message);
  }

  // 4. IPAPI.is Full Object Inspection
  try {
    const res = await fetch('https://api.ipapi.is/?q=8.8.8.8', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json() as {
        ip?: string;
        is_datacenter?: boolean;
        is_vpn?: boolean;
        is_proxy?: boolean;
        is_tor?: boolean;
        company?: { name?: string; domain?: string; type?: string };
        asn?: { asn?: number; org?: string; route?: string };
        location?: { country?: string; state?: string; city?: string };
      };
      console.log('IPAPI.is full:', {
        company: data.company?.name,
        asn: data.asn?.asn,
        org: data.asn?.org,
        is_datacenter: data.is_datacenter,
        is_vpn: data.is_vpn,
        location: data.location?.city
      });
    }
  } catch (e) {
    console.log('IPAPI.is Error:', (e as Error).message);
  }

  // 5. OpenDNS DoH
  try {
    const res = await fetch('https://doh.opendns.com/dns-query?name=google.com&type=A', {
      headers: { 'Accept': 'application/dns-json' },
      signal: AbortSignal.timeout(4000)
    });
    console.log('OpenDNS Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { Answer?: { data: string }[] };
      console.log('OpenDNS Answer:', data.Answer?.map(a => a.data));
    }
  } catch (e) {
    console.log('OpenDNS Error:', (e as Error).message);
  }

  // 6. Cloudflare Security / Phishing URL check via Cloudflare Radar (public endpoint) or AbuseIPDB public / Blocklist.de
  try {
    const res = await fetch('https://api.blocklist.de/api.php?ip=1.1.1.1&format=json', { signal: AbortSignal.timeout(4000) });
    console.log('Blocklist.de Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('Blocklist.de Sample:', data);
    }
  } catch (e) {
    console.log('Blocklist.de Error:', (e as Error).message);
  }
}

testMoreSources();
