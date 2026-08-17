import type { UrlScanResult } from '../types';

function detectTechnologies(headers: { key: string; value: string }[], serverHeader: string): string[] {
  const techs = new Set<string>();

  const lowerServer = serverHeader.toLowerCase();
  if (lowerServer.includes('cloudflare')) techs.add('Cloudflare');
  if (lowerServer.includes('nginx')) techs.add('Nginx');
  if (lowerServer.includes('apache')) techs.add('Apache HTTP Server');
  if (lowerServer.includes('litespeed')) techs.add('LiteSpeed');
  if (lowerServer.includes('caddy')) techs.add('Caddy');
  if (lowerServer.includes('envoy')) techs.add('Envoy');
  if (lowerServer.includes('microsoft-iis')) techs.add('Microsoft IIS');
  if (lowerServer.includes('gunicorn')) techs.add('Gunicorn');
  if (lowerServer.includes('openresty')) techs.add('OpenResty');

  headers.forEach(({ key, value }) => {
    const lk = key.toLowerCase();
    const lv = value.toLowerCase();

    if (lk === 'cf-ray' || lk === 'cf-cache-status') techs.add('Cloudflare CDN');
    if (lk === 'x-powered-by') {
      if (lv.includes('express')) techs.add('Express.js');
      if (lv.includes('php')) techs.add(`PHP (${value})`);
      if (lv.includes('next.js')) techs.add('Next.js');
      if (lv.includes('asp.net')) techs.add('ASP.NET');
      if (lv.includes('wp-engine')) techs.add('WP Engine');
    }
    if (lk === 'x-vercel-id') techs.add('Vercel Edge Platform');
    if (lk === 'x-amz-cf-id' || lk === 'x-amz-cf-pop') techs.add('Amazon CloudFront');
    if (lk === 'x-github-request-id') techs.add('GitHub Pages / API');
    if (lk === 'x-fastly-request-id') techs.add('Fastly CDN');
    if (lk === 'x-akamai-transformed') techs.add('Akamai CDN');
    if (lk === 'x-drupal-cache') techs.add('Drupal CMS');
    if (lk === 'x-generator' && lv.includes('wordpress')) techs.add('WordPress');
  });

  return Array.from(techs);
}

export async function scanUrl(inputUrl: string): Promise<UrlScanResult> {
  const startTime = performance.now();
  let targetUrl = inputUrl.trim();
  if (!targetUrl.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
    targetUrl = 'https://' + targetUrl;
  }

  let currentUrl = targetUrl;
  const redirectChain: string[] = [currentUrl];
  let redirected = false;
  let status = 200;
  let statusText = 'OK';
  let headersList: { key: string; value: string }[] = [];
  let contentType = '';
  let server = '';
  let loopCount = 0;
  const maxHops = 5;

  const secHeaders = {
    hasHsts: false,
    hstsDetails: undefined as { maxAge?: number; includeSubDomains: boolean; preload: boolean } | undefined,
    hasCsp: false,
    hasXFrameOptions: false,
    hasContentTypeOptions: false,
    hasReferrerPolicy: false,
    hasPermissionsPolicy: false,
    hasCoep: false,
    hasCoop: false,
    hasCorp: false,
    grade: 'F' as 'A+' | 'A' | 'B' | 'C' | 'D' | 'F',
    score: 0
  };

  while (loopCount < maxHops) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MultiTools-Scanner/1.0; +https://tools.noob31.com)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        redirect: 'manual',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      status = res.status;
      statusText = res.statusText;

      headersList = [];
      res.headers.forEach((value, key) => {
        headersList.push({ key, value });
        const lowerKey = key.toLowerCase();

        if (lowerKey === 'strict-transport-security') {
          secHeaders.hasHsts = true;
          const maxAgeMatch = value.match(/max-age=(\d+)/i);
          const incSub = /includesubdomains/i.test(value);
          const preload = /preload/i.test(value);
          secHeaders.hstsDetails = {
            maxAge: maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : undefined,
            includeSubDomains: incSub,
            preload
          };
        }
        if (lowerKey === 'content-security-policy') secHeaders.hasCsp = true;
        if (lowerKey === 'x-frame-options') secHeaders.hasXFrameOptions = true;
        if (lowerKey === 'x-content-type-options') secHeaders.hasContentTypeOptions = true;
        if (lowerKey === 'referrer-policy') secHeaders.hasReferrerPolicy = true;
        if (lowerKey === 'permissions-policy') secHeaders.hasPermissionsPolicy = true;
        if (lowerKey === 'cross-origin-embedder-policy') secHeaders.hasCoep = true;
        if (lowerKey === 'cross-origin-opener-policy') secHeaders.hasCoop = true;
        if (lowerKey === 'cross-origin-resource-policy') secHeaders.hasCorp = true;
      });

      contentType = res.headers.get('content-type') || contentType;
      server = res.headers.get('server') || server;

      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        redirected = true;
        let nextUrl = location;
        try {
          nextUrl = new URL(location, currentUrl).href;
        } catch {
          // ignore
        }
        redirectChain.push(nextUrl);
        currentUrl = nextUrl;
        loopCount++;
      } else {
        break;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (loopCount === 0) {
        throw new Error(`Failed to connect to ${currentUrl}: ${err instanceof Error ? err.message : String(err)}`);
      }
      break;
    }
  }

  // Calculate Security Score & Grade
  let score = 0;
  if (secHeaders.hasHsts) {
    score += 25;
    if (secHeaders.hstsDetails?.includeSubDomains) score += 5;
    if (secHeaders.hstsDetails?.preload) score += 5;
  }
  if (secHeaders.hasCsp) score += 25;
  if (secHeaders.hasXFrameOptions) score += 15;
  if (secHeaders.hasContentTypeOptions) score += 10;
  if (secHeaders.hasReferrerPolicy) score += 10;
  if (secHeaders.hasPermissionsPolicy) score += 5;

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 65) grade = 'B';
  else if (score >= 50) grade = 'C';
  else if (score >= 30) grade = 'D';

  secHeaders.score = score;
  secHeaders.grade = grade;

  const detectedTechnologies = detectTechnologies(headersList, server);
  const responseTimeMs = Math.round(performance.now() - startTime);

  return {
    url: inputUrl,
    finalUrl: currentUrl,
    status,
    statusText,
    redirected,
    redirectChain,
    responseTimeMs,
    contentType,
    server,
    detectedTechnologies,
    headers: headersList,
    securityHeaders: secHeaders
  };
}
