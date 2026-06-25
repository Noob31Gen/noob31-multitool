import { defaultSettings, type AppSettings } from './lib/settings';
import { queryDNS } from './lib/doh';
import { parseSPF, parseKeyValue, formatEmailAuthQuery, filterEmailAuthRecords } from './lib/emailAuthParsers';
import { queryRDAP } from './lib/rdap';
import { searchEntities, getEntityBySymbol } from './lib/entitydb';
import { parseUrl, visitUrl } from './lib/urlScanner';
import { querySubdomains } from './lib/subdomains';
import { lookupReverseDns } from './lib/reverseDns';
import { lookupMac } from './lib/macLookup';
import { checkBlacklist } from './lib/blacklist';
import { checkDomainReputation } from './lib/reputation';
import { searchThreatIntel } from './lib/threatIntel';
import { queryCveDb } from './lib/cvedb';
import { parseEmailHeaders } from './lib/headerParser';
import { calculateSubnet } from './lib/subnet';
import { runDomainHealth } from './lib/health';
import { runDeliverabilityCheck } from './lib/deliverability';
import { queryCert } from './lib/cert';
import { queryGeoping } from './lib/geonet';
import { fetchHeaders } from './lib/http';

function getSettingsFromRequest(url: URL): AppSettings {
  const settings = { ...defaultSettings };
  const doh = url.searchParams.get('dohProvider');
  if (doh) {
    settings.dohProvider = doh as any;
  }
  const dnsUrl = url.searchParams.get('customDnsUrl');
  if (dnsUrl) {
    settings.customDnsUrl = dnsUrl;
  }
  return settings;
}

function jsonResponse(data: any, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...headers
    }
  });
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Handle preflight CORS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    const target = url.searchParams.get('target') || '';
    const settings = getSettingsFromRequest(url);

    try {
      switch (url.pathname) {
        case '/dns': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const recordType = url.searchParams.get('type') || 'A';
          const result = await queryDNS(
            target,
            recordType,
            settings.dohProvider,
            settings.customDnsUrl,
            settings.corsProvider,
            settings.customCorsUrl
          );
          return jsonResponse(result);
        }

        case '/dnssec': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const recordType = url.searchParams.get('type') || 'A';
          const [mainRes, dnskeyRes] = await Promise.all([
            queryDNS(target, recordType, settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl),
            queryDNS(target, 'DNSKEY', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl)
          ]);
          return jsonResponse({
            main: mainRes,
            dnskey: dnskeyRes,
            isSigned: dnskeyRes.records && dnskeyRes.records.length > 0
          });
        }

        case '/email-auth': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const selector = url.searchParams.get('selector') || 'default';
          const doh = settings.dohProvider;
          const dnsUrl = settings.customDnsUrl;
          const cors = settings.corsProvider;
          const ccUrl = settings.customCorsUrl;

          const spfTarget = formatEmailAuthQuery(target, 'SPF', '');
          const dkimTarget = formatEmailAuthQuery(target, 'DKIM', selector);
          const dmarcTarget = formatEmailAuthQuery(target, 'DMARC', '');
          const bimiTarget = formatEmailAuthQuery(target, 'BIMI', selector);
          const mtaStsTarget = formatEmailAuthQuery(target, 'MTA-STS', '');
          const tlsRptTarget = formatEmailAuthQuery(target, 'TLSRPT', '');

          const [spfRes, dkimRes, dmarcRes, bimiRes, mtaStsRes, tlsRptRes] = await Promise.all([
            queryDNS(spfTarget, 'TXT', doh, dnsUrl, cors, ccUrl).catch(() => null),
            queryDNS(dkimTarget, 'TXT', doh, dnsUrl, cors, ccUrl).catch(() => null),
            queryDNS(dmarcTarget, 'TXT', doh, dnsUrl, cors, ccUrl).catch(() => null),
            queryDNS(bimiTarget, 'TXT', doh, dnsUrl, cors, ccUrl).catch(() => null),
            queryDNS(mtaStsTarget, 'TXT', doh, dnsUrl, cors, ccUrl).catch(() => null),
            queryDNS(tlsRptTarget, 'TXT', doh, dnsUrl, cors, ccUrl).catch(() => null)
          ]);

          const spfRecords = spfRes ? filterEmailAuthRecords(spfRes.records, 'SPF') : [];
          const dkimRecords = dkimRes ? filterEmailAuthRecords(dkimRes.records, 'DKIM') : [];
          const dmarcRecords = dmarcRes ? filterEmailAuthRecords(dmarcRes.records, 'DMARC') : [];
          const bimiRecords = bimiRes ? filterEmailAuthRecords(bimiRes.records, 'BIMI') : [];
          const mtaStsRecords = mtaStsRes ? filterEmailAuthRecords(mtaStsRes.records, 'MTA-STS') : [];
          const tlsRptRecords = tlsRptRes ? filterEmailAuthRecords(tlsRptRes.records, 'TLSRPT') : [];

          return jsonResponse({
            spf: { raw: spfRecords, parsed: spfRecords.length > 0 ? parseSPF(spfRecords[0].data) : null },
            dkim: { raw: dkimRecords, parsed: dkimRecords.length > 0 ? parseKeyValue(dkimRecords[0].data) : null },
            dmarc: { raw: dmarcRecords, parsed: dmarcRecords.length > 0 ? parseKeyValue(dmarcRecords[0].data) : null },
            bimi: { raw: bimiRecords, parsed: bimiRecords.length > 0 ? parseKeyValue(bimiRecords[0].data) : null },
            mtaSts: { raw: mtaStsRecords, parsed: mtaStsRecords.length > 0 ? parseKeyValue(mtaStsRecords[0].data) : null },
            tlsRpt: { raw: tlsRptRecords, parsed: tlsRptRecords.length > 0 ? parseKeyValue(tlsRptRecords[0].data) : null },
          });
        }

        case '/registration': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const result = await queryRDAP(target, settings);
          return jsonResponse(result);
        }

        case '/company': {
          const symbol = url.searchParams.get('symbol');
          if (symbol) {
            const result = await getEntityBySymbol(symbol, settings);
            return jsonResponse(result);
          } else {
            const results = await searchEntities(settings);
            return jsonResponse(results);
          }
        }

        case '/url-scanner': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const parsed = parseUrl(target);
          const visit = await visitUrl(target, settings);
          return jsonResponse({ parsed, visit });
        }

        case '/subdomains': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          let subdomainsList: any[] = [];
          let errorsList: string[] = [];
          await querySubdomains(target, settings, (results, errors) => {
            subdomainsList = results;
            errorsList = errors;
          });
          return jsonResponse({ subdomains: subdomainsList, errors: errorsList });
        }

        case '/reverse-dns': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const result = await lookupReverseDns(target, settings);
          return jsonResponse(result);
        }

        case '/my-ip': {
          const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
          const cf = (request as any).cf || {};
          return jsonResponse({
            ip,
            country: cf.country || 'Unknown',
            city: cf.city || 'Unknown',
            asn: cf.asn || null,
            asOrganization: cf.asOrganization || 'Unknown',
            latitude: cf.latitude || null,
            longitude: cf.longitude || null,
            postalCode: cf.postalCode || null,
            region: cf.region || null,
            regionCode: cf.regionCode || null,
            timezone: cf.timezone || null,
          });
        }

        case '/mac-lookup': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const result = await lookupMac(target, settings.corsProvider, settings.customCorsUrl);
          return jsonResponse(result);
        }

        case '/http': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const scheme = url.searchParams.get('scheme') || 'https';
          let finalUrl = target.trim();
          if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = `${scheme}://${finalUrl}`;
          }
          const result = await fetchHeaders(finalUrl, settings);
          return jsonResponse(result);
        }

        case '/ping': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const result = await queryGeoping(target, settings);
          return jsonResponse(result);
        }

        case '/domain-health': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const selector = url.searchParams.get('selector') || '';
          const result = await runDomainHealth(target, selector, settings);
          return jsonResponse(result);
        }

        case '/deliverability': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const selector = url.searchParams.get('selector') || '';
          const result = await runDeliverabilityCheck(target, selector, settings);
          return jsonResponse(result);
        }

        case '/cert': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const result = await queryCert(target, settings);
          return jsonResponse(result);
        }

        case '/blacklist': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const result = await checkBlacklist(target, settings);
          return jsonResponse(result);
        }

        case '/reputation': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const result = await checkDomainReputation(target, settings);
          return jsonResponse(result);
        }

        case '/threat-intel': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const result = await searchThreatIntel(target, settings);
          return jsonResponse(result);
        }

        case '/cve': {
          if (!target) return jsonResponse({ error: "Missing 'target' parameter" }, 400);
          const result = await queryCveDb(target, settings);
          return jsonResponse(result);
        }

        case '/email-headers': {
          if (request.method !== 'POST') {
            return jsonResponse({ error: "Only POST method is allowed for /email-headers" }, 405);
          }
          const rawHeaders = await request.text();
          const result = parseEmailHeaders(rawHeaders);
          return jsonResponse(result);
        }

        case '/subnet': {
          const ip = url.searchParams.get('ip') || '';
          const cidr = url.searchParams.get('cidr') || '';
          if (!ip || !cidr) {
            return jsonResponse({ error: "Missing 'ip' or 'cidr' parameters" }, 400);
          }
          const cidrNum = parseInt(cidr, 10);
          const result = calculateSubnet(ip, cidrNum);
          return jsonResponse(result);
        }

        default:
          return jsonResponse({ error: "Not Found", path: url.pathname }, 404);
      }
    } catch (err: any) {
      return jsonResponse({ error: err.message || String(err) }, 500);
    }
  }
};
