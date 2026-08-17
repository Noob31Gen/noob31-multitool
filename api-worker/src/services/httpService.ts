import type { UrlScanResult } from '../types';

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

  const securityHeaders = {
    hasHsts: false,
    hasCsp: false,
    hasXFrameOptions: false,
    hasContentTypeOptions: false,
    hasReferrerPolicy: false
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
        if (lowerKey === 'strict-transport-security') securityHeaders.hasHsts = true;
        if (lowerKey === 'content-security-policy') securityHeaders.hasCsp = true;
        if (lowerKey === 'x-frame-options') securityHeaders.hasXFrameOptions = true;
        if (lowerKey === 'x-content-type-options') securityHeaders.hasContentTypeOptions = true;
        if (lowerKey === 'referrer-policy') securityHeaders.hasReferrerPolicy = true;
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
    headers: headersList,
    securityHeaders
  };
}
