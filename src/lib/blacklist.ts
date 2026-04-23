import { queryDNS } from "./doh"
import type { AppSettings } from "./settings"

export const DNSBL_ZONES = [
  "bl.spamcop.net",
  "b.barracudacentral.org",
  "zen.spamhaus.org",
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
    // If they provided a DQS key and this is spamhaus, format correctly
    let targetZone = zone;
    if (zone.includes('spamhaus.org') && settings.apiKeys.spamhausDqs) {
      targetZone = `${settings.apiKeys.spamhausDqs}.${zone}`;
    }

    const target = `${reversedIp}.${targetZone}`;
    try {
      const res = await queryDNS(target, 'A', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl);
      // Status 3 = NXDOMAIN = not listed
      if (res.status === 3 || res.records.length === 0) {
        return { zone, listed: false, records: [], error: false };
      }
      return { zone, listed: true, records: res.records, error: false };
    } catch (err) {
      return { zone, listed: false, records: [], error: true };
    }
  });

  return Promise.all(promises);
}
