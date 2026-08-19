export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  executionTimeMs: number;
}

export interface DnsRecord {
  name: string;
  type: number;
  typeName: string;
  TTL: number;
  data: string;
}

export interface DnsLookupResult {
  domain: string;
  type: string;
  status: number;
  records: DnsRecord[];
  authority?: DnsRecord[];
  provider: string;
  queryTimeMs: number;
}

export interface ReverseDnsResult {
  ip: string;
  ptr: string[];
  queryTimeMs: number;
}

export interface ThreatPulse {
  id: string;
  name: string;
  description: string;
  author: string;
  created: string;
  tags: string[];
}

export interface UrlScanResultItem {
  id: string;
  url: string;
  domain: string;
  ip: string;
  time: string;
  title: string;
  screenshot?: string;
  server?: string;
  mimeType?: string;
  asnname?: string;
}

export interface ThreatIntelResponse {
  query: string;
  detectedType: 'ip' | 'domain' | 'url' | 'hash' | 'keyword';
  otxPulses: ThreatPulse[];
  otxMetadata?: {
    reputation?: number;
  };
  urlScanHistory: UrlScanResultItem[];
  internetDb?: {
    ip: string;
    ports?: number[];
    cves?: string[];
    tags?: string[];
    hostnames?: string[];
    vulns?: string[];
  } | null;
  blocklistDe?: {
    attacks?: number;
    reports?: number;
  } | null;
  sourceErrors?: Record<string, string>;
  queryTimeMs: number;
}

export interface MacLookupResult {
  mac: string;
  oui: string;
  vendor: string;
  address?: string;
  country?: string;
  range?: {
    start: string;
    end: string;
  };
  blockType?: string;
  category?: string;
  isUnicast: boolean;
  isUniversal: boolean;
  source: string;
  queryTimeMs: number;
}

export interface CertRecord {
  issuer_ca_id?: number;
  issuer_name: string;
  common_name: string;
  name_value: string;
  id?: number;
  entry_timestamp?: string;
  not_before: string;
  not_after: string;
  serial_number?: string;
}

export interface SubdomainResult {
  domain: string;
  subdomains: string[];
  count: number;
  sourcesUsed: string[];
  queryTimeMs: number;
}

export interface AsnInfo {
  asn: number;
  name?: string;
  description?: string;
  country?: string;
  allocated?: string;
  prefixes?: string[];
  origins?: number[];
  abuseContacts?: string[];
  peeringDb?: {
    org?: string;
    website?: string;
    ixCount?: number;
    facCount?: number;
  };
}

export interface GeoIpResult {
  ip: string;
  ipVersion: 4 | 6;
  country?: string;
  countryCode?: string;
  countryCode3?: string;
  region?: string;
  regionCode?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  asn?: number;
  asOrganization?: string;
  isDatacenter?: boolean;
  isVpn?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
  abuseContacts?: string[];
  stopForumSpam?: {
    appears?: number;
  };
  routingPrefixes?: string[];
  colo?: string;
  sourcesUsed?: string[];
}

export interface CveDetail {
  id: string;
  summary?: string;
  cvss?: number;
  cvssVector?: string;
  published?: string;
  modified?: string;
  references?: string[];
  vulnerableProducts?: string[];
  epss?: {
    score: number;
    percentile: number;
  };
  isKnownExploited?: boolean;
  cisaKev?: {
    vendorProject?: string;
    product?: string;
    vulnerabilityName?: string;
    dateAdded?: string;
    shortDescription?: string;
    requiredAction?: string;
    dueDate?: string;
  };
}

export interface UrlScanResult {
  url: string;
  finalUrl: string;
  status: number;
  statusText: string;
  redirected: boolean;
  redirectChain: string[];
  responseTimeMs: number;
  contentType: string;
  server: string;
  detectedTechnologies: string[];
  headers: { key: string; value: string }[];
  securityHeaders: {
    hasHsts: boolean;
    hstsDetails?: { maxAge?: number; includeSubDomains: boolean; preload: boolean };
    hasCsp: boolean;
    hasXFrameOptions: boolean;
    hasContentTypeOptions: boolean;
    hasReferrerPolicy: boolean;
    hasPermissionsPolicy: boolean;
    hasCoep: boolean;
    hasCoop: boolean;
    hasCorp: boolean;
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    score: number;
  };
}

export interface EmailAuthResult {
  domain: string;
  spf: {
    record?: string;
    valid: boolean;
    mechanisms?: string[];
    qualifier?: string;
    warnings?: string[];
  };
  dmarc: {
    record?: string;
    valid: boolean;
    policy?: string;
    subdomainPolicy?: string;
    percentage?: number;
    rua?: string[];
    ruf?: string[];
    warnings?: string[];
  };
  dkim?: {
    selector?: string;
    record?: string;
    valid: boolean;
  };
}
