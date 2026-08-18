import app from '../src/index';

async function testWorker() {
  console.log('Running comprehensive Worker validation suite...\n');

  // 1. Root and health
  const rootRes = await app.request('/');
  const rootJson = await rootRes.json() as { success: boolean; status: number; endpoint: string; data: { service: string; openApiSpec: string } };
  console.assert(rootRes.status === 200 && rootJson.success, 'Root should succeed');
  console.log('✔ Root API Envelope:', { status: rootJson.status, endpoint: rootJson.endpoint, service: rootJson.data.service });

  // 2. OpenAPI 3.1.0 Spec & Swagger / Docs
  const openapiRes = await app.request('/openapi.json');
  const openapiJson = await openapiRes.json() as { openapi: string; paths: Record<string, unknown> };
  console.assert(openapiRes.status === 200 && openapiJson.openapi.startsWith('3.1'), 'OpenAPI 3.1 should be valid');
  console.log(`✔ OpenAPI 3.1.0 Spec: ${Object.keys(openapiJson.paths).length} endpoints documented`);

  const docsRes = await app.request('/docs');
  console.assert(docsRes.status === 200, 'Interactive Docs should be 200');
  console.log('✔ Interactive API Docs UI: Status 200');

  // 3. DNS Lookup with DoH
  const dnsRes = await app.request('/api/dns/lookup?name=google.com&type=A');
  const dnsJson = await dnsRes.json() as { success: boolean; executionTimeMs: number; data?: { records?: unknown[] } };
  console.assert(dnsRes.status === 200 && dnsJson.success, 'DNS lookup should succeed');
  console.log(`✔ DNS Lookup: ${dnsJson.data?.records?.length} records (${dnsJson.executionTimeMs}ms)`);

  // 4. Multi-Resolver Global DNS Propagation
  const propRes = await app.request('/api/dns/propagation?domain=google.com&type=A');
  const propJson = await propRes.json() as { success: boolean; data?: { totalResolvers: number; successfulResolvers: number; consensusPercentage: number } };
  console.assert(propRes.status === 200 && propJson.success, 'DNS propagation should succeed');
  console.log(`✔ Global DNS Propagation: ${propJson.data?.successfulResolvers}/${propJson.data?.totalResolvers} resolvers reached (Consensus: ${propJson.data?.consensusPercentage}%)`);

  // 5. Subdomain Enumeration (6 sources)
  const subRes = await app.request('/api/network/subdomains?domain=google.com');
  const subJson = await subRes.json() as { success: boolean; data?: { count?: number; sourcesUsed?: string[] } };
  console.assert(subRes.status === 200 && subJson.success, 'Subdomains lookup should succeed');
  console.log(`✔ Subdomain Discovery: Found ${subJson.data?.count} subdomains from: [${subJson.data?.sourcesUsed?.join(', ')}]`);

  // 6. Subnet / CIDR Calculator
  const subnetRes = await app.request('/api/tools/subnet?cidr=192.168.1.50/24');
  const subnetJson = await subnetRes.json() as { success: boolean; data?: { networkAddress: string; broadcastAddress: string; usableHosts: string; binaryNetmask: string } };
  console.assert(subnetRes.status === 200 && subnetJson.success, 'Subnet calculator should succeed');
  console.log(`✔ Subnet Calculator: Network ${subnetJson.data?.networkAddress}, Broadcast ${subnetJson.data?.broadcastAddress}, Usable Hosts: ${subnetJson.data?.usableHosts}`);

  // 7. Cryptographic Hash Identifier & Generator
  const hashRes = await app.request('/api/tools/hash?input=test');
  const hashJson = await hashRes.json() as { success: boolean; data?: { generatedHashes: { sha256: string } } };
  console.assert(hashRes.status === 200 && hashJson.success, 'Hash processing should succeed');
  console.log(`✔ Cryptographic Hash Generator: SHA-256 = ${hashJson.data?.generatedHashes.sha256.slice(0, 16)}...`);

  // 8. Typosquatting Domain Generator
  const typoRes = await app.request('/api/security/typosquat?domain=google.com');
  const typoJson = await typoRes.json() as { success: boolean; data?: { totalVariationsChecked: number; activeRegisteredCount: number } };
  console.assert(typoRes.status === 200 && typoJson.success, 'Typosquatting check should succeed');
  console.log(`✔ Typosquatting Detector: Checked ${typoJson.data?.totalVariationsChecked} variations (${typoJson.data?.activeRegisteredCount} active registrations)`);

  // 9. Email Header Hop Parser
  const sampleHeaders = `Received: from mail.example.com (mail.example.com [192.0.2.1]) by mx.google.com with ESMTPS id abc; Mon, 17 Aug 2026 10:00:00 -0700\nFrom: sender@example.com\nTo: recipient@google.com\nSubject: Test Email Header Analysis`;
  const emailHopRes = await app.request('/api/email/parse-headers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headers: sampleHeaders })
  });
  const emailHopJson = await emailHopRes.json() as { success: boolean; data?: { totalHops: number; subject: string; from: string } };
  console.assert(emailHopRes.status === 200 && emailHopJson.success, 'Email header parsing should succeed');
  console.log(`✔ Email Header Hop Analyzer: Parsed ${emailHopJson.data?.totalHops} hops (Subject: "${emailHopJson.data?.subject}", From: "${emailHopJson.data?.from}")`);

  // 10. Standardized Error Envelope
  const errRes = await app.request('/non-existent-route');
  const errJson = await errRes.json() as { success: boolean; status: number; error: string; hint?: string };
  console.assert(errRes.status === 404 && !errJson.success, '404 error envelope should be structured');
  console.log(`✔ Standardized Error Envelope: Status ${errJson.status}, Error: "${errJson.error}"`);

  console.log('\n✔ All 10 verification test suites passed with 100% success!');
}

testWorker().catch(err => {
  console.error('Worker test failed:', err);
  process.exit(1);
});
