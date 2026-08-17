async function testAllNewCandidates() {
  console.log('Testing extensive candidate sources across all categories...\n');

  // 1. DNS / DoH Resolvers
  console.log('--- [1] DNS / DoH Resolvers ---');
  const dohResolvers = [
    { name: 'DNS.SB', url: 'https://doh.dns.sb/dns-query?name=google.com&type=A' },
    { name: 'Cloudflare 1.1.1.1', url: 'https://1.1.1.1/dns-query?name=google.com&type=A' },
    { name: 'Mullvad', url: 'https://dns.mullvad.net/dns-query?name=google.com&type=A' },
    { name: 'AliDNS', url: 'https://dns.alidns.com/resolve?name=google.com&type=A' },
    { name: 'AdGuard', url: 'https://dns.adguard-dns.com/resolve?name=google.com&type=A' },
    { name: 'Google Public DNS', url: 'https://dns.google/resolve?name=google.com&type=A' },
  ];

  for (const r of dohResolvers) {
    try {
      const res = await fetch(r.url, {
        headers: { 'Accept': 'application/dns-json' },
        signal: AbortSignal.timeout(3000)
      });
      console.log(`  ${r.name}: Status ${res.status}`);
    } catch (e) {
      console.log(`  ${r.name}: Error ${(e as Error).message}`);
    }
  }

  // 2. Subdomains & Passive DNS
  console.log('\n--- [2] Subdomains & Passive DNS ---');
  // HackerTarget Hostsearch
  try {
    const res = await fetch('https://api.hackertarget.com/hostsearch/?q=google.com', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000)
    });
    console.log('  HackerTarget Hostsearch Status:', res.status);
    if (res.ok) {
      const text = await res.text();
      console.log('  HackerTarget snippet:', text.slice(0, 100).replace(/\n/g, ' '));
    }
  } catch (e) {
    console.log('  HackerTarget Error:', (e as Error).message);
  }

  // AlienVault Passive DNS
  try {
    const res = await fetch('https://otx.alienvault.com/api/v1/indicators/domain/google.com/passive_dns', {
      signal: AbortSignal.timeout(4000)
    });
    console.log('  AlienVault Passive DNS Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { count?: number; passive_dns?: { hostname?: string }[] };
      console.log('  AlienVault Passive DNS count:', data.count || data.passive_dns?.length);
    }
  } catch (e) {
    console.log('  AlienVault Passive DNS Error:', (e as Error).message);
  }

  // 3. IP, ASN & BGP Intelligence
  console.log('\n--- [3] IP & BGP Intelligence ---');
  // RIPE Stat Prefix Overview
  try {
    const res = await fetch('https://stat.ripe.net/data/prefix-overview/data.json?resource=8.8.8.8/24', {
      signal: AbortSignal.timeout(3500)
    });
    console.log('  RIPE Stat Prefix Overview Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { data?: { asns?: { asn?: number; holder?: string }[] } };
      console.log('  RIPE Prefix ASNs:', data.data?.asns?.map(a => `${a.asn} (${a.holder})`));
    }
  } catch (e) {
    console.log('  RIPE Prefix Error:', (e as Error).message);
  }

  // RIPE Stat Abuse Contact Finder
  try {
    const res = await fetch('https://stat.ripe.net/data/abuse-contact-finder/data.json?resource=8.8.8.8', {
      signal: AbortSignal.timeout(3500)
    });
    console.log('  RIPE Stat Abuse Contact Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { data?: { abuse_contacts?: string[] } };
      console.log('  RIPE Abuse Contacts:', data.data?.abuse_contacts);
    }
  } catch (e) {
    console.log('  RIPE Abuse Contact Error:', (e as Error).message);
  }

  // StopForumSpam
  try {
    const res = await fetch('https://api.stopforumspam.org/api?ip=8.8.8.8&json', {
      signal: AbortSignal.timeout(3500)
    });
    console.log('  StopForumSpam Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { ip?: { appears?: number; frequency?: number } };
      console.log('  StopForumSpam appears:', data.ip?.appears);
    }
  } catch (e) {
    console.log('  StopForumSpam Error:', (e as Error).message);
  }

  // WTFismyIP
  try {
    const res = await fetch('https://wtfismyip.com/json', { signal: AbortSignal.timeout(3500) });
    console.log('  WTFismyIP Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { YourFuckingIPAddress?: string; YourFuckingLocation?: string; YourFuckingISP?: string };
      console.log('  WTFismyIP ISP:', data.YourFuckingISP, 'Location:', data.YourFuckingLocation);
    }
  } catch (e) {
    console.log('  WTFismyIP Error:', (e as Error).message);
  }

  // 4. WHOIS & Registration Sources
  console.log('\n--- [4] WHOIS & Registration Sources ---');
  // ARIN REST API
  try {
    const res = await fetch('https://whois.arin.net/rest/ip/8.8.8.8.json', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3500)
    });
    console.log('  ARIN REST API Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { net?: { orgRef?: { '@name'?: string }; name?: { '$'?: string } } };
      console.log('  ARIN Org:', data.net?.orgRef?.['@name'], 'Net Name:', data.net?.name?.['$']);
    }
  } catch (e) {
    console.log('  ARIN REST API Error:', (e as Error).message);
  }

  // 5. Threat Intelligence Feeds
  console.log('\n--- [5] Threat Intelligence & Phishing Feeds ---');
  // PhishStats
  try {
    const res = await fetch('https://api.phishstats.info/api/phishing?_size=2', {
      signal: AbortSignal.timeout(3500)
    });
    console.log('  PhishStats Feed Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { url?: string; title?: string }[];
      console.log('  PhishStats Sample URL:', data[0]?.url);
    }
  } catch (e) {
    console.log('  PhishStats Error:', (e as Error).message);
  }

  // 6. MAC Address Vendors
  console.log('\n--- [6] MAC Address Sources ---');
  try {
    const res = await fetch('https://macvendors.co/api/001122', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3500)
    });
    console.log('  MACVendors.co Status:', res.status);
    if (res.ok) {
      const data = await res.json() as { result?: { company?: string; address?: string; country?: string } };
      console.log('  MACVendors.co Company:', data.result?.company);
    }
  } catch (e) {
    console.log('  MACVendors.co Error:', (e as Error).message);
  }

  // 7. Company & Entity Intelligence
  console.log('\n--- [7] Company & Securities Sources ---');
  // SEC Company Tickers
  try {
    const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': 'Noob31MultiTools admin@noob31.com' },
      signal: AbortSignal.timeout(4000)
    });
    console.log('  SEC Company Tickers Status:', res.status);
    if (res.ok) {
      const data = await res.json() as Record<string, { cik_str?: number; ticker?: string; title?: string }>;
      const sample = data['0'];
      console.log('  SEC Sample:', sample?.ticker, '-', sample?.title, `(CIK: ${sample?.cik_str})`);
    }
  } catch (e) {
    console.log('  SEC Company Tickers Error:', (e as Error).message);
  }
}

testAllNewCandidates();
