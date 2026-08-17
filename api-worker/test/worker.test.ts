import app from '../src/index';

async function testWorker() {
  console.log('Testing Worker Endpoints...');

  // 1. Test Root
  const rootRes = await app.request('/');
  console.log('Root Status:', rootRes.status);
  const rootJson = await rootRes.json() as { status: string; service: string };
  console.assert(rootRes.status === 200, 'Root status should be 200');
  console.assert(rootJson.status === 'online', 'Service should be online');

  // 2. Test Health
  const healthRes = await app.request('/health');
  console.log('Health Status:', healthRes.status);
  console.assert(healthRes.status === 200, 'Health status should be 200');

  // 3. Test 404
  const notFoundRes = await app.request('/non-existent');
  console.log('404 Status:', notFoundRes.status);
  console.assert(notFoundRes.status === 404, 'Unknown route should be 404');

  // 4. Test CORS Header Presence
  console.log('CORS Header:', rootRes.headers.get('Access-Control-Allow-Origin'));
  console.assert(rootRes.headers.get('Access-Control-Allow-Origin') === '*', 'CORS origin should be *');

  console.log('✔ All local worker assertions passed successfully!');
}

testWorker().catch(err => {
  console.error('Worker test failed:', err);
  process.exit(1);
});
