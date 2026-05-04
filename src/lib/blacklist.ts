import { queryDNS } from "./doh"
import type { AppSettings } from "./settings"
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
  "ubl.unsubscore.com",
  "list.dnswl.org"
];
export async function checkBlacklist(ip: string, settings: AppSettings) {
  ip = ip.trim();
  const isIPv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip);
  if (!isIPv4) throw new Error("Blacklist check currently requires a valid IPv4 address.");
  const reversedIp = ip.split('.').reverse().join('.');
  const promises = DNSBL_ZONES.map(async (zone) => {
    const target = `${reversedIp}.${zone}`;
    try {
      const resA = await queryDNS(target, 'A', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl);
      if (resA.status === 3 || resA.records.length === 0) {
        return { zone, listed: false, records: [], details: null, classification: null, error: false };
      }
      const returnIps = resA.records.map((r: { data: string }) => r.data);
      const classification = returnIps.join(', ');
      let txtDetails = null;
      try {
        const resTxt = await queryDNS(target, 'TXT', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl);
        if (resTxt.records && resTxt.records.length > 0) {
          txtDetails = resTxt.records.map((r: { data: string }) => r.data.replace(/(^"|"$)/g, '')).join(' | ');
        }
      } catch {
        // Fallback for TXT records failing
      }
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