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

// Map standard DNSBL return codes to human-readable threats
const getSpamhausReason = (ip: string) => {
  if (ip === '127.0.0.2') return 'SBL (Known Spam Operation)';
  if (ip === '127.0.0.3') return 'CSS (Snowshoe Spam)';
  if (ip === '127.0.0.4' || ip === '127.0.0.5' || ip === '127.0.0.6' || ip === '127.0.0.7') return 'XBL (Malware / Botnet / Open Proxy)';
  if (ip === '127.0.0.9' || ip === '127.0.0.10' || ip === '127.0.0.11') return 'PBL (End-User IP Policy Violation)';
  return 'Blacklisted';
};

export async function checkBlacklist(ip: string, settings: AppSettings) {
  ip = ip.trim();

  const isIPv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip);
  if (!isIPv4) throw new Error("Blacklist check currently requires a valid IPv4 address.");

  const reversedIp = ip.split('.').reverse().join('.');

  const promises = DNSBL_ZONES.map(async (zone) => {
    let targetZone = zone;
    // If they provided a DQS key and this is spamhaus, format correctly
    if (zone.includes('spamhaus.org') && settings.apiKeys.spamhausDqs) {
      targetZone = `${settings.apiKeys.spamhausDqs}.${zone}`;
    }

    const target = `${reversedIp}.${targetZone}`;

    try {
      // 1. Query A Record to check if listed
      const resA = await queryDNS(target, 'A', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl);

      if (resA.status === 3 || resA.records.length === 0) {
        return { zone, listed: false, records: [], details: null, classification: null, error: false };
      }

      // 2. Identify the specific block reason
      const returnIps = resA.records.map((r: any) => r.data);
      let classification = returnIps.join(', ');

      // If it's Spamhaus, translate the loopback IPs into actual threat intelligence
      if (zone.includes('spamhaus.org')) {
        classification = returnIps.map((retIp: string) => getSpamhausReason(retIp)).join(' | ');
      }

      // 3. Query TXT Record to get the incident URL and text details
      let txtDetails = null;
      try {
        const resTxt = await queryDNS(target, 'TXT', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl);
        if (resTxt.records && resTxt.records.length > 0) {
          // Clean up the quotes standard DNS TXT records return with
          txtDetails = resTxt.records.map((r: any) => r.data.replace(/(^"|"$)/g, '')).join(' | ');
        }
      } catch (txtErr) {
        // Fail silently on TXT lookup, keep the A record positive hit
      }

      return {
        zone,
        listed: true,
        records: returnIps,
        classification,
        details: txtDetails,
        error: false
      };

    } catch (err) {
      return { zone, listed: false, records: [], details: null, classification: null, error: true };
    }
  });

  return Promise.all(promises);
}