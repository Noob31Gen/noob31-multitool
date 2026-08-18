import type { AppSettings } from './settings';
import type { DNSResponse, DNSRecord } from './doh';
import { logger } from './logger';

export interface ApiServerResponse<T = unknown> {
  success: boolean;
  status?: number;
  timestamp?: string;
  endpoint?: string;
  executionTimeMs?: number;
  data?: T;
  error?: string;
  hint?: string;
}

export interface ServerConnectionTestResult {
  ok: boolean;
  status: number;
  statusText: string;
  latencyMs: number;
  service?: string;
  version?: string;
  errorMessage?: string;
}

/**
 * Checks if Custom Server resolution mode is active with a non-empty URL.
 */
export function isCustomServerEnabled(settings: AppSettings): boolean {
  return settings.serverMode === 'custom' && Boolean(settings.customServerUrl?.trim());
}

/**
 * Normalizes a base URL by trimming whitespace and trailing slashes.
 */
export function normalizeServerUrl(url: string): string {
  let cleaned = (url || '').trim();
  while (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}

/**
 * Executes an authenticated fetch against the configured Custom API Server.
 * Supports:
 * 1. Bearer Token (Authorization: Bearer <token>)
 * 2. URL Embedded Basic Auth (https://user:pass@host)
 * 3. Automatic Cookie Transmission (credentials: 'include')
 */
export async function authenticatedServerFetch<T = unknown>(
  path: string,
  settings: AppSettings,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = normalizeServerUrl(settings.customServerUrl);
  if (!baseUrl) {
    throw new Error('Custom Server URL is not configured.');
  }

  const endpointPath = path.startsWith('/') ? path : `/${path}`;
  const fullTargetUrl = `${baseUrl}${endpointPath}`;

  const headers = new Headers(options.headers || {});
  let finalUrl = fullTargetUrl;

  // 1. Basic Auth parsing if embedded in URL
  try {
    const parsed = new URL(fullTargetUrl);
    if (parsed.username || parsed.password) {
      const basicAuth = btoa(`${parsed.username}:${parsed.password}`);
      headers.set('Authorization', `Basic ${basicAuth}`);
      parsed.username = '';
      parsed.password = '';
      finalUrl = parsed.toString();
    }
  } catch {
    // If URL parsing fails, proceed with original string
  }

  // 2. Bearer Token injection (if not overridden by basic auth or custom header)
  if (settings.customServerToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${settings.customServerToken.trim()}`);
  }

  // 3. Cookie credentials
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  };

  const controller = new AbortController();
  const timeoutMs = 25000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(finalUrl, {
      ...fetchOptions,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timer);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }
      const rawText = await response.text();
      return rawText as unknown as T;
    }

    const json = (await response.json()) as ApiServerResponse<T>;

    if (!response.ok || json.success === false) {
      const errDetail = json.error || `HTTP ${response.status}: ${response.statusText}`;
      const hint = json.hint ? ` (${json.hint})` : '';
      throw new Error(`${errDetail}${hint}`);
    }

    // Return the payload inside data if wrapped in standard envelope
    if (json.data !== undefined) {
      return json.data;
    }

    return json as unknown as T;
  } catch (err: unknown) {
    clearTimeout(timer);
    logger.error(`[API Server] Request to ${path} failed:`, err);
    throw err;
  }
}

/**
 * Tests connection and authentication against the Custom Server's /health or / endpoint.
 */
export async function testServerConnection(settings: AppSettings): Promise<ServerConnectionTestResult> {
  const startTime = performance.now();
  const baseUrl = normalizeServerUrl(settings.customServerUrl);

  if (!baseUrl) {
    return {
      ok: false,
      status: 0,
      statusText: 'No URL Provided',
      latencyMs: 0,
      errorMessage: 'Please enter a valid Custom Server URL (e.g. https://api.yourdomain.com).',
    };
  }

  try {
    const healthResult = await authenticatedServerFetch<{
      status: string;
      service?: string;
      version?: string;
    }>('/health', settings, { method: 'GET' });

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      latencyMs,
      service: healthResult.service || 'MultiTools API Worker',
      version: healthResult.version,
    };
  } catch {
    // Fallback: try root / endpoint
    try {
      const rootResult = await authenticatedServerFetch<{
        service?: string;
        version?: string;
        status?: string;
      }>('/', settings, { method: 'GET' });

      const latencyMs = Math.round(performance.now() - startTime);

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        latencyMs,
        service: rootResult.service || 'Custom API Server',
        version: rootResult.version,
      };
    } catch (rootErr: unknown) {
      const latencyMs = Math.round(performance.now() - startTime);
      const errMsg = rootErr instanceof Error ? rootErr.message : String(rootErr);

      return {
        ok: false,
        status: 500,
        statusText: 'Connection Failed',
        latencyMs,
        errorMessage: errMsg,
      };
    }
  }
}

// ==========================================
// ENDPOINT CLIENT METHODS
// ==========================================

/**
 * 1. DNS Lookup via Custom Server (/api/dns/lookup)
 */
export async function queryDnsServer(
  name: string,
  type: string = 'A',
  provider: string = 'auto',
  settings: AppSettings
): Promise<DNSResponse> {
  const queryParams = new URLSearchParams({
    name: name.trim(),
    type: type.trim().toUpperCase(),
    provider: provider || 'auto',
  });

  const res = await authenticatedServerFetch<{
    domain: string;
    type: string;
    status: number;
    records: DNSRecord[];
    authority?: DNSRecord[];
    provider: string;
    queryTimeMs: number;
  }>(`/api/dns/lookup?${queryParams.toString()}`, settings);

  return {
    status: res.status ?? 0,
    records: res.records || [],
    authority: res.authority || [],
    queryTime: res.queryTimeMs || 0,
    provider: res.provider || provider || 'custom-server',
  };
}

/**
 * 2. DNSSEC Validation via Custom Server (/api/dns/dnssec)
 */
export async function queryDnssecServer(
  name: string,
  type: string = 'DNSKEY',
  settings: AppSettings
): Promise<DNSResponse> {
  const queryParams = new URLSearchParams({
    name: name.trim(),
    type: type.trim().toUpperCase(),
  });

  const res = await authenticatedServerFetch<{
    domain: string;
    type: string;
    status: number;
    records: DNSRecord[];
    authority?: DNSRecord[];
    provider: string;
    queryTimeMs: number;
  }>(`/api/dns/dnssec?${queryParams.toString()}`, settings);

  return {
    status: res.status ?? 0,
    records: res.records || [],
    authority: res.authority || [],
    queryTime: res.queryTimeMs || 0,
    provider: res.provider || 'custom-server',
  };
}

/**
 * 3. Reverse DNS (PTR) via Custom Server (/api/dns/reverse)
 */
export async function queryReverseDnsServer(
  ip: string,
  settings: AppSettings
): Promise<{
  ip: string;
  hostnames: string[];
  ptrRecords: string[];
  queryTime: number;
}> {
  const queryParams = new URLSearchParams({ ip: ip.trim() });
  const res = await authenticatedServerFetch<{
    ip: string;
    ptr: string[];
    queryTimeMs: number;
  }>(`/api/dns/reverse?${queryParams.toString()}`, settings);

  return {
    ip: res.ip,
    hostnames: res.ptr || [],
    ptrRecords: res.ptr || [],
    queryTime: res.queryTimeMs || 0,
  };
}

/**
 * 4. RDAP Registration Lookup (/api/rdap/lookup)
 */
export async function queryRdapServer(query: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ query: query.trim() });
  return authenticatedServerFetch<unknown>(`/api/rdap/lookup?${queryParams.toString()}`, settings);
}

/**
 * 5. Company / Corporate Intelligence (/api/rdap/company)
 */
export async function queryCompanyServer(query: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ query: query.trim() });
  return authenticatedServerFetch<unknown>(`/api/rdap/company?${queryParams.toString()}`, settings);
}

/**
 * 6. Threat Intelligence Explorer (/api/security/threat-intel)
 */
export async function queryThreatIntelServer(query: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ query: query.trim() });
  return authenticatedServerFetch<unknown>(`/api/security/threat-intel?${queryParams.toString()}`, settings);
}

/**
 * 7. CVE Vulnerability Lookup (/api/security/cve)
 */
export async function queryCveServer(cve: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ cve: cve.trim() });
  return authenticatedServerFetch<unknown>(`/api/security/cve?${queryParams.toString()}`, settings);
}

/**
 * 8. Blacklist / Anti-Spam Check (/api/security/blacklist)
 */
export async function queryBlacklistServer(target: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ target: target.trim() });
  return authenticatedServerFetch<unknown>(`/api/security/blacklist?${queryParams.toString()}`, settings);
}

/**
 * 9. Domain Reputation & Risk Score (/api/security/reputation)
 */
export async function queryReputationServer(target: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ target: target.trim() });
  return authenticatedServerFetch<unknown>(`/api/security/reputation?${queryParams.toString()}`, settings);
}

/**
 * 10. SSL/TLS Certificate Transparency (/api/security/cert)
 */
export async function queryCertServer(domain: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ domain: domain.trim() });
  return authenticatedServerFetch<unknown>(`/api/security/cert?${queryParams.toString()}`, settings);
}

/**
 * 11. Typosquatting Check (/api/security/typosquat)
 */
export async function queryTyposquatServer(domain: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ domain: domain.trim() });
  return authenticatedServerFetch<unknown>(`/api/security/typosquat?${queryParams.toString()}`, settings);
}

/**
 * 12. Subdomain Scanner (/api/network/subdomains)
 */
export async function querySubdomainsServer(
  domain: string,
  settings: AppSettings
): Promise<{
  domain: string;
  subdomains: string[];
  count: number;
  sourcesUsed: string[];
  queryTimeMs: number;
}> {
  const queryParams = new URLSearchParams({ domain: domain.trim() });
  return authenticatedServerFetch<{
    domain: string;
    subdomains: string[];
    count: number;
    sourcesUsed: string[];
    queryTimeMs: number;
  }>(`/api/network/subdomains?${queryParams.toString()}`, settings);
}

/**
 * 13. My IP Context (/api/network/my-ip)
 */
export async function queryMyIpServer(settings: AppSettings): Promise<unknown> {
  return authenticatedServerFetch<unknown>('/api/network/my-ip', settings);
}

/**
 * 14. GeoIP Lookup (/api/network/geoip)
 */
export async function queryGeoIpServer(ip: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ ip: ip.trim() });
  return authenticatedServerFetch<unknown>(`/api/network/geoip?${queryParams.toString()}`, settings);
}

/**
 * 15. ASN & BGP Route Lookup (/api/network/asn)
 */
export async function queryAsnServer(asnOrIp: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams();
  if (/^\d+$/.test(asnOrIp.replace(/^AS/i, ''))) {
    queryParams.set('asn', asnOrIp.replace(/^AS/i, ''));
  } else {
    queryParams.set('ip', asnOrIp);
  }
  return authenticatedServerFetch<unknown>(`/api/network/asn?${queryParams.toString()}`, settings);
}

/**
 * 16. MAC Address OUI Lookup (/api/network/mac)
 */
export async function queryMacServer(mac: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ mac: mac.trim() });
  return authenticatedServerFetch<unknown>(`/api/network/mac?${queryParams.toString()}`, settings);
}

/**
 * 17. URL & HTTP Scanner (/api/http/scan)
 */
export async function queryHttpScanServer(url: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ url: url.trim() });
  return authenticatedServerFetch<unknown>(`/api/http/scan?${queryParams.toString()}`, settings);
}

/**
 * 18. HTTP Headers Audit (/api/http/headers)
 */
export async function queryHttpHeadersServer(url: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ url: url.trim() });
  return authenticatedServerFetch<unknown>(`/api/http/headers?${queryParams.toString()}`, settings);
}

/**
 * 19. Email Authentication Validation (/api/email/auth)
 */
export async function queryEmailAuthServer(
  domain: string,
  selector: string | undefined,
  settings: AppSettings
): Promise<unknown> {
  const queryParams = new URLSearchParams({ domain: domain.trim() });
  if (selector?.trim()) {
    queryParams.set('selector', selector.trim());
  }
  return authenticatedServerFetch<unknown>(`/api/email/auth?${queryParams.toString()}`, settings);
}

/**
 * 20. Email Deliverability Score (/api/email/deliverability)
 */
export async function queryEmailDeliverabilityServer(domain: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ domain: domain.trim() });
  return authenticatedServerFetch<unknown>(`/api/email/deliverability?${queryParams.toString()}`, settings);
}

/**
 * 21. Email Header Parser (/api/email/parse-headers)
 */
export async function queryEmailParseHeadersServer(rawHeaders: string, settings: AppSettings): Promise<unknown> {
  return authenticatedServerFetch<unknown>('/api/email/parse-headers', settings, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headers: rawHeaders }),
  });
}

/**
 * 22. Subnet / CIDR Calculator (/api/tools/subnet)
 */
export async function querySubnetServer(cidr: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ cidr: cidr.trim() });
  return authenticatedServerFetch<unknown>(`/api/tools/subnet?${queryParams.toString()}`, settings);
}

/**
 * 23. Hash Analyzer & Multi-Generator (/api/tools/hash)
 */
export async function queryHashServer(input: string, settings: AppSettings): Promise<unknown> {
  const queryParams = new URLSearchParams({ input: input.trim() });
  return authenticatedServerFetch<unknown>(`/api/tools/hash?${queryParams.toString()}`, settings);
}
