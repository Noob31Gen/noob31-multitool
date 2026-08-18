import { queryDNS } from "./doh"
import type { AppSettings } from "./settings"
import { isValidIP, expandIPv6 } from "./reverseDns"

export const DNSBL_ZONES = [
  "bl.spamcop.net",
  "b.barracudacentral.org",
  "cbl.abuseat.org",
  "dnsbl.sorbs.net",
  "spam.spamrats.com",
  "all.s5h.net",
  "bl.blocklist.de",
  "bl.spameatingmonkey.net",
  "dnsbl.dronebl.org",
  "ips.backscatterer.org",
  "ix.dnsbl.manitu.net",
  "psbl.surriel.com",
  "ubl.unsubscore.com"
];

function getDnsblTarget(ip: string, zone: string): string {
  const { valid, isIPv6 } = isValidIP(ip);
  if (!valid) throw new Error("Invalid IP address");

  if (!isIPv6) {
    const reversedIp = ip.split('.').reverse().join('.');
    return `${reversedIp}.${zone}`;
  } else {
    const expanded = expandIPv6(ip);
    const hexDigits = expanded.replace(/:/g, '').split('');
    const reversedNibbles = hexDigits.reverse().join('.');
    return `${reversedNibbles}.${zone}`;
  }
}

export async function checkBlacklist(ip: string, settings: AppSettings) {
  ip = ip.trim();
  const { valid } = isValidIP(ip);
  if (!valid) throw new Error("Blacklist check requires a valid IPv4 or IPv6 address.");

  const promises = DNSBL_ZONES.map(async (zone) => {
    try {
      const target = getDnsblTarget(ip, zone);
      const resA = await queryDNS(target, 'A', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl, settings);
      if (resA.status === 3 || resA.records.length === 0) {
        return { zone, listed: false, records: [], details: null, classification: null, error: false };
      }
      const returnIps = resA.records.map((r: { data: string }) => r.data);
      
      const isRefused = returnIps.some(ipAddr => 
        ipAddr.startsWith("127.255.255.") || 
        (ipAddr === "127.0.0.1" && (zone.includes("barracudacentral") || zone.includes("sorbs") || zone.includes("spamcop")))
      );

      if (isRefused) {
        return {
          zone,
          listed: false,
          records: [],
          details: "Query Refused / Rate Limited by DNSBL (public resolver query block)",
          classification: null,
          error: false
        };
      }

      const classification = returnIps.join(', ');
      let txtDetails = null;
      try {
        const resTxt = await queryDNS(target, 'TXT', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl, settings);
        if (resTxt.records && resTxt.records.length > 0) {
          txtDetails = resTxt.records.map((r: { data: string }) => r.data.replace(/(^"|"$)/g, '')).join(' | ');
        }
      } catch { /* ignore */ }
      return {
        zone,
        listed: true,
        records: returnIps,
        classification,
        details: txtDetails,
        error: false
      };
    } catch {
      return { zone, listed: false, records: [], details: null, classification: null, error: true };
    }
  });
  return Promise.all(promises);
}