import { queryDNS } from "./doh";
import { queryASN } from "./asn";
import type { AppSettings } from "./settings";

export interface ReverseDnsResult {
  ip: string;
  isIPv6: boolean;
  reverseDomain: string;
  classification: string;
  hostnames: string[];
  queryTime: number;
  provider: string;
  asnDetails?: {
    asn?: string;
    org?: string;
    rir?: string;
    country?: string;
    type?: string;
    prefixesV4?: number;
    prefixesV6?: number;
  };
  error?: string;
}

export function isValidIP(ip: string): { valid: boolean; isIPv6: boolean } {
  const trimmed = ip.trim();
  
  // IPv4 regex
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (ipv4Regex.test(trimmed)) {
    const parts = trimmed.split('.').map(p => parseInt(p, 10));
    const allValid = parts.every(p => p >= 0 && p <= 255);
    return { valid: allValid, isIPv6: false };
  }

  // IPv6 check: should contain colon and not exceed length of full IPv6
  if (trimmed.includes(':')) {
    try {
      expandIPv6(trimmed);
      return { valid: true, isIPv6: true };
    } catch {
      return { valid: false, isIPv6: true };
    }
  }

  return { valid: false, isIPv6: false };
}

export function expandIPv6(ip: string): string {
  let cleaned = ip.replace(/\[|\]/g, '').trim().toLowerCase();
  
  // Handle ipv4-mapped ipv6 (e.g. ::ffff:192.168.1.1)
  if (cleaned.includes('.')) {
    const lastColon = cleaned.lastIndexOf(':');
    const ipv4Part = cleaned.substring(lastColon + 1);
    const ipv4Parts = ipv4Part.split('.').map(p => parseInt(p, 10));
    if (ipv4Parts.length !== 4 || ipv4Parts.some(isNaN)) {
      throw new Error("Invalid IPv4-mapped IPv6 address");
    }
    const hex1 = ((ipv4Parts[0] << 8) + ipv4Parts[1]).toString(16).padStart(4, '0');
    const hex2 = ((ipv4Parts[2] << 8) + ipv4Parts[3]).toString(16).padStart(4, '0');
    cleaned = cleaned.substring(0, lastColon + 1) + hex1 + ':' + hex2;
  }

  const parts = cleaned.split('::');
  if (parts.length > 2) {
    throw new Error("Invalid IPv6: multiple :: double colons");
  }

  let left = parts[0] ? parts[0].split(':') : [];
  const right = parts[1] ? parts[1].split(':') : [];

  // If split by double colon, compute how many zero groups to insert
  if (parts.length === 1) {
    if (left.length !== 8) {
      throw new Error("Invalid IPv6: incomplete address");
    }
  } else {
    const leftCount = left.length === 1 && left[0] === '' ? 0 : left.length;
    const rightCount = right.length === 1 && right[0] === '' ? 0 : right.length;
    const gapCount = 8 - (leftCount + rightCount);
    if (gapCount < 0) {
      throw new Error("Invalid IPv6: too many colons");
    }
    const gap = Array(gapCount).fill('0000');
    
    // Filter out empty elements
    const cleanLeft = left.filter(Boolean);
    const cleanRight = right.filter(Boolean);
    left = [...cleanLeft, ...gap, ...cleanRight];
  }

  // Validate block hex format
  const hexBlockRegex = /^[0-9a-fA-F]{1,4}$/;
  for (const block of left) {
    if (!hexBlockRegex.test(block)) {
      throw new Error("Invalid IPv6 block format");
    }
  }

  return left.map(block => block.padStart(4, '0')).join(':');
}

export function classifyIP(ip: string): string {
  const trimmed = ip.trim();
  const { valid, isIPv6 } = isValidIP(trimmed);
  if (!valid) return "Invalid IP Address";

  if (!isIPv6) {
    const parts = trimmed.split('.').map(p => parseInt(p, 10));
    const first = parts[0];
    const second = parts[1];
    const third = parts[2];
    const fourth = parts[3];

    if (first === 127) return "Loopback Address (RFC 1122)";
    if (first === 10) return "Private Network (RFC 1918)";
    if (first === 172 && (second >= 16 && second <= 31)) return "Private Network (RFC 1918)";
    if (first === 192 && second === 168) return "Private Network (RFC 1918)";
    if (first === 169 && second === 254) return "Link-Local Address (APIPA / RFC 3927)";
    if (first === 100 && (second >= 64 && second <= 127)) return "Carrier-Grade NAT (RFC 6598)";
    if (first === 0) return "Local Host / Bogon (RFC 1122)";
    if (first === 255 && second === 255 && third === 255 && fourth === 255) return "Broadcast Address (RFC 919)";
    if (first >= 224 && first <= 239) return "Multicast Address (RFC 5771)";
    if (first >= 240 && first <= 255) return "Reserved / Experimental Address (RFC 1112)";
    return "Public IPv4 Address";
  } else {
    try {
      const expanded = expandIPv6(trimmed);
      if (expanded === "0000:0000:0000:0000:0000:0000:0000:0001") return "Loopback Address (RFC 4291)";
      if (expanded === "0000:0000:0000:0000:0000:0000:0000:0000") return "Unspecified Address (RFC 4291)";
      
      if (expanded.startsWith("ff")) return "Multicast Address (RFC 4291)";
      if (expanded.startsWith("fe8") || expanded.startsWith("fe9") || expanded.startsWith("fea") || expanded.startsWith("feb")) {
        return "Link-Local Address (RFC 4291)";
      }
      if (expanded.startsWith("fc") || expanded.startsWith("fd")) return "Unique Local / Private Address (RFC 4193)";
      if (expanded.startsWith("2001:0db8")) return "Documentation Range (RFC 3849)";
      return "Public IPv6 Address";
    } catch {
      return "Invalid IPv6 Address";
    }
  }
}

export function getReverseDomain(ip: string): string {
  const trimmed = ip.trim();
  const { valid, isIPv6 } = isValidIP(trimmed);
  if (!valid) throw new Error("Invalid IP address");

  if (!isIPv6) {
    return trimmed.split('.').reverse().join('.') + '.in-addr.arpa';
  } else {
    const expanded = expandIPv6(trimmed);
    const hexDigits = expanded.replace(/:/g, '').split('');
    return hexDigits.reverse().join('.') + '.ip6.arpa';
  }
}

export async function lookupReverseDns(
  ip: string,
  settings: AppSettings
): Promise<ReverseDnsResult> {
  const startTime = Date.now();
  const { valid, isIPv6 } = isValidIP(ip);

  if (!valid) {
    throw new Error("Please enter a valid IPv4 or IPv6 address.");
  }

  const classification = classifyIP(ip);
  const reverseDomain = getReverseDomain(ip);

  // If loopback, private, bogon or documentation, do not query DNS
  const isPrivate =
    classification.includes("Loopback") ||
    classification.includes("Private") ||
    classification.includes("Link-Local") ||
    classification.includes("Reserved") ||
    classification.includes("Unspecified") ||
    classification.includes("Documentation");

  let hostnames: string[] = [];
  let provider: string = settings.dohProvider;
  let error: string | undefined;

  if (isPrivate) {
    hostnames = ["localhost / private local hostname"];
  } else {
    try {
      const dnsRes = await queryDNS(
        reverseDomain,
        "PTR",
        settings.dohProvider,
        settings.customDnsUrl,
        settings.corsProvider,
        settings.customCorsUrl
      );
      provider = dnsRes.provider;
      if (dnsRes.records && dnsRes.records.length > 0) {
        hostnames = dnsRes.records.map(r => r.data.replace(/\.$/, '')); // strip trailing dot if present
      }
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  // Background info collection
  let asnDetails: ReverseDnsResult["asnDetails"];
  try {
    const asnRes = await queryASN(ip, settings);
    if (asnRes.parsed) {
      asnDetails = {
        asn: asnRes.parsed.asn,
        org: asnRes.parsed.org,
        rir: asnRes.parsed.rir,
        country: asnRes.parsed.country || asnRes.parsed.country_code,
        prefixesV4: asnRes.parsed.prefixes_v4?.length || 0,
        prefixesV6: asnRes.parsed.prefixes_v6?.length || 0
      };
    }
  } catch {
    // Ignore ASN lookup errors
  }

  return {
    ip,
    isIPv6,
    reverseDomain,
    classification,
    hostnames,
    queryTime: Date.now() - startTime,
    provider,
    asnDetails,
    error
  };
}
