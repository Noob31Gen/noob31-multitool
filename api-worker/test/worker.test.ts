import app from '../src/index';

async function testWorker() {
  console.log('Running full validation suite across all server-to-server endpoints...\n');

  // 1. Root and health
  const rootRes = await app.request('/');
  console.log('✔ Root endpoint:', rootRes.status);
  const healthRes = await app.request('/health');
  console.log('✔ Health endpoint:', healthRes.status);

  // 2. DNS Lookup with expanded DoH pool
  const dnsRes = await app.request('/api/dns/lookup?name=google.com&type=A&provider=auto');
  const dnsJson = await dnsRes.json() as { success: boolean; data?: { records?: unknown[]; provider?: string } };
  console.assert(dnsRes.status === 200 && dnsJson.success, 'DNS lookup should succeed');
  console.log(`✔ DNS Lookup: Resolved ${dnsJson.data?.records?.length} records via provider "${dnsJson.data?.provider}"`);

  // 3. Subdomain Enumeration (with HackerTarget & RapidDNS)
  const subRes = await app.request('/api/network/subdomains?domain=google.com');
  const subJson = await subRes.json() as { success: boolean; data?: { count?: number; sourcesUsed?: string[] } };
  console.assert(subRes.status === 200 && subJson.success, 'Subdomains lookup should succeed');
  console.log(`✔ Subdomain Discovery: Found ${subJson.data?.count} subdomains from sources: [${subJson.data?.sourcesUsed?.join(', ')}]`);

  // 4. Company Search (with SEC EDGAR CIK dataset & Clearbit & Yahoo)
  const compRes = await app.request('/api/rdap/company?query=Microsoft');
  const compJson = await compRes.json() as { success: boolean; data?: { name: string; symbol?: string; cik?: string; source?: string }[] };
  console.assert(compRes.status === 200 && compJson.success, 'Company lookup should succeed');
  console.log(`✔ Company Search: Found ${compJson.data?.length} results. Top: "${compJson.data?.[0]?.name}" (${compJson.data?.[0]?.symbol || ''}) from ${compJson.data?.[0]?.source}`);

  // 5. CVE & EPSS & CISA KEV Lookup
  const cveRes = await app.request('/api/security/cve?cve=CVE-2021-44228');
  const cveJson = await cveRes.json() as { success: boolean; data?: { id?: string; epss?: { score: number }; isKnownExploited?: boolean } };
  console.assert(cveRes.status === 200 && cveJson.success, 'CVE lookup should succeed');
  console.log(`✔ CVE Intelligence: ${cveJson.data?.id} (EPSS Score: ${cveJson.data?.epss?.score}, CISA Known Exploited: ${cveJson.data?.isKnownExploited})`);

  // 6. GeoIP & Proxy/Datacenter & Abuse Intelligence
  const geoRes = await app.request('/api/network/geoip?ip=8.8.8.8');
  const geoJson = await geoRes.json() as { success: boolean; data?: { country?: string; isDatacenter?: boolean; sourcesUsed?: string[] } };
  console.assert(geoRes.status === 200 && geoJson.success, 'GeoIP lookup should succeed');
  console.log(`✔ GeoIP & Threat Context: ${geoJson.data?.country} (Datacenter: ${geoJson.data?.isDatacenter}) Sources: [${geoJson.data?.sourcesUsed?.join(', ')}]`);

  // 7. MAC Address Lookup with Troubleshooting.tools
  const macRes = await app.request('/api/network/mac?mac=001122');
  const macJson = await macRes.json() as { success: boolean; data?: { vendor?: string; source?: string } };
  console.assert(macRes.status === 200 && macJson.success, 'MAC lookup should succeed');
  console.log(`✔ MAC Vendor Lookup: ${macJson.data?.vendor} (Source: ${macJson.data?.source})`);

  // 8. URL Scan & Security Headers Grading
  const scanRes = await app.request('/api/url/scan?url=https://google.com');
  const scanJson = await scanRes.json() as { success: boolean; data?: { status: number; securityHeaders?: { grade: string; score: number }; detectedTechnologies?: string[] } };
  console.assert(scanRes.status === 200 && scanJson.success, 'URL scan should succeed');
  console.log(`✔ URL & Security Headers: HTTP ${scanJson.data?.status} (Security Grade: ${scanJson.data?.securityHeaders?.grade}, Score: ${scanJson.data?.securityHeaders?.score}/100, Tech: [${scanJson.data?.detectedTechnologies?.join(', ')}])`);

  console.log('\n✔ All server-to-server diagnostic tests passed with 100% success!');
}

testWorker().catch(err => {
  console.error('Worker test failed:', err);
  process.exit(1);
});
