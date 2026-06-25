import { queryDNS, type DNSRecord } from "./doh";
import { filterEmailAuthRecords } from "./emailAuthParsers";
import type { AppSettings } from "./settings";

export function validateDmarcSyntax(dmarcRecord: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const tags = dmarcRecord.split(';').map(t => t.trim()).filter(Boolean);
  
  const dmarcTags: Record<string, string> = {};
  for (const t of tags) {
    const parts = t.split('=');
    if (parts.length === 2) {
      dmarcTags[parts[0].trim().toLowerCase()] = parts[1].trim();
    }
  }

  if (dmarcTags['v'] && dmarcTags['v'].toUpperCase() !== 'DMARC1') {
    errors.push("v= tag value must be DMARC1.");
  }
  
  const p = dmarcTags['p'];
  if (!p) {
    errors.push("Missing policy (p=) tag.");
  } else if (!['none', 'quarantine', 'reject'].includes(p.toLowerCase())) {
    errors.push(`Invalid policy value: p=${p}. Must be 'none', 'quarantine', or 'reject'.`);
  }

  const pct = dmarcTags['pct'];
  if (pct) {
    const pctVal = parseInt(pct, 10);
    if (isNaN(pctVal) || pctVal < 0 || pctVal > 100) {
      errors.push(`Invalid percentage: pct=${pct}. Must be an integer between 0 and 100.`);
    }
  }

  const rua = dmarcTags['rua'];
  if (rua) {
    const uris = rua.split(',');
    for (const uri of uris) {
      if (!uri.trim().toLowerCase().startsWith('mailto:')) {
        errors.push(`Reporting URI in rua tag must start with mailto: (${uri.trim()})`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export async function discoverDkim(domain: string, settings: AppSettings): Promise<{ records: DNSRecord[]; selector: string }> {
  const commonSelectors = ['google', 'default', 'k1', 'mail', 'mx', 'selector1', 'sig1', 'dkim', 'key'];
  const promises = commonSelectors.map(async (sel) => {
    try {
      const target = `${sel}._domainkey.${domain}`;
      const res = await queryDNS(target, 'TXT', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl);
      const filtered = filterEmailAuthRecords(res.records, 'DKIM');
      if (filtered && filtered.length > 0) {
        return { records: filtered, selector: sel };
      }
    } catch { /* ignore */ }
    return null;
  });
  
  const results = await Promise.all(promises);
  const found = results.find(r => r !== null);
  return found || { records: [], selector: 'default' };
}

interface SpfAnalysis {
  lookupsCount: number;
  errors: string[];
  warnings: string[];
}

export async function analyzeSpfRecursively(
  domain: string,
  settings: AppSettings,
  visited = new Set<string>(),
  depth = 0
): Promise<SpfAnalysis> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let lookupsCount = 0;

  const cleanDomain = domain.trim().toLowerCase();
  if (visited.has(cleanDomain)) {
    errors.push(`SPF loop detected at domain '${cleanDomain}'.`);
    return { lookupsCount: 0, errors, warnings };
  }
  visited.add(cleanDomain);

  try {
    const res = await queryDNS(cleanDomain, 'TXT', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl);
    const spfRecord = res.records.find(r => r.data.toLowerCase().includes('v=spf1'));
    if (!spfRecord) {
      // If we are at the root domain, this is an error. For external includes, it is also an error.
      errors.push(`Domain '${cleanDomain}' has no valid SPF (TXT) record.`);
      return { lookupsCount, errors, warnings };
    }

    const spfText = spfRecord.data.toLowerCase().replace(/(^"|"$)/g, '').trim();
    const parts = spfText.split(/\s+/);
    
    if (!parts[0].startsWith('v=spf1')) {
      errors.push(`Domain '${cleanDomain}' SPF record does not start with v=spf1.`);
    }

    const includeDomains: string[] = [];
    let redirectDomain = '';

    for (const part of parts) {
      if (part === 'v=spf1') continue;

      const cleanPart = part.replace(/^[-+?~]/, '');

      if (cleanPart.startsWith('include:')) {
        lookupsCount++;
        includeDomains.push(cleanPart.substring(8));
      } else if (cleanPart.startsWith('redirect=')) {
        lookupsCount++;
        redirectDomain = cleanPart.substring(9);
      } else if (cleanPart === 'a' || cleanPart.startsWith('a:') || cleanPart.startsWith('a/')) {
        lookupsCount++;
      } else if (cleanPart === 'mx' || cleanPart.startsWith('mx:') || cleanPart.startsWith('mx/')) {
        lookupsCount++;
      } else if (cleanPart === 'ptr' || cleanPart.startsWith('ptr:')) {
        lookupsCount++;
      } else if (cleanPart.startsWith('exists:')) {
        lookupsCount++;
      }
    }

    for (const incDom of includeDomains) {
      const subAnalysis = await analyzeSpfRecursively(incDom, settings, new Set(visited), depth + 1);
      lookupsCount += subAnalysis.lookupsCount;
      errors.push(...subAnalysis.errors.map(e => `SPF include '${incDom}': ${e}`));
      warnings.push(...subAnalysis.warnings.map(w => `SPF include '${incDom}': ${w}`));
    }

    if (redirectDomain) {
      const subAnalysis = await analyzeSpfRecursively(redirectDomain, settings, new Set(visited), depth + 1);
      lookupsCount += subAnalysis.lookupsCount;
      errors.push(...subAnalysis.errors.map(e => `SPF redirect '${redirectDomain}': ${e}`));
      warnings.push(...subAnalysis.warnings.map(w => `SPF redirect '${redirectDomain}': ${w}`));
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Failed to resolve external SPF domain '${cleanDomain}': ${msg}`);
  }

  return { lookupsCount, errors, warnings };
}
