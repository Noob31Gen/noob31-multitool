import { queryDNS, type DNSRecord } from "./doh";
import { formatEmailAuthQuery, filterEmailAuthRecords } from "./emailAuthParsers";
import type { AppSettings } from "./settings";

function isValidFQDN(domain: string): boolean {
  const fqdnRegex = /^(?=.{1,253}$)(?:(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$/;
  return fqdnRegex.test(domain);
}

const extractTxt = (record: { data?: string; value?: string } | string | null | undefined): string => {
  if (!record) return "";
  if (typeof record === 'string') return record.toLowerCase();
  return String(record.data || record.value || "").toLowerCase();
};

async function discoverDkim(domain: string, settings: AppSettings): Promise<{ records: DNSRecord[]; selector: string }> {
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

function validateDmarcSyntax(dmarcRecord: string): { valid: boolean; errors: string[] } {
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

async function validateSpfIncludes(spfRecord: string, settings: AppSettings): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const parts = spfRecord.split(/\s+/);
  const includeDomains: string[] = [];
  let redirectDomain = '';

  for (const part of parts) {
    if (part.toLowerCase().startsWith('include:')) {
      includeDomains.push(part.substring(8));
    } else if (part.toLowerCase().startsWith('redirect=')) {
      redirectDomain = part.substring(9);
    }
  }

  const domainsToCheck = [...includeDomains];
  if (redirectDomain) domainsToCheck.push(redirectDomain);

  const lookups = domainsToCheck.map(async (dom) => {
    try {
      const res = await queryDNS(dom, 'TXT', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl);
      const spfText = res.records.find(r => r.data.toLowerCase().includes('v=spf1'));
      if (!spfText) {
        errors.push(`Domain '${dom}' in SPF record has no valid SPF (TXT) record.`);
      }
    } catch {
      errors.push(`Failed to resolve external SPF domain '${dom}'.`);
    }
  });

  await Promise.all(lookups);

  return {
    valid: errors.length === 0,
    errors
  };
}

export async function runDeliverabilityCheck(domain: string, selector: string, settings: AppSettings) {
  domain = domain.trim();
  const selectorTrimmed = selector.trim();
  const recommendations: { level: 'critical' | 'high' | 'medium' | 'low' | 'good', msg: string }[] = [];
  let score = 100;

  if (!isValidFQDN(domain)) {
    return {
      score: 0,
      grade: 'F',
      results: [],
      recommendations: [{ level: 'critical', msg: 'Invalid domain format.' }]
    };
  }

  const types = ['SPF', 'DMARC', 'BIMI', 'MTA-STS', 'TLSRPT'];
  const promises = types.map(type => {
    const target = formatEmailAuthQuery(domain, type, '');
    return queryDNS(target, 'TXT', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl)
      .then(res => ({ type, records: filterEmailAuthRecords(res.records, type), raw: res.records }))
      .catch(() => ({ type, records: [], raw: [] }));
  });

  const mxPromise = queryDNS(domain, 'MX', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl)
    .then(res => ({ type: 'MX', records: res.records, raw: res.records }))
    .catch(() => ({ type: 'MX', records: [], raw: [] }));

  const dkimPromise = selectorTrimmed
    ? queryDNS(`${selectorTrimmed}._domainkey.${domain}`, 'TXT', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl)
        .then(res => ({ records: filterEmailAuthRecords(res.records, 'DKIM'), selector: selectorTrimmed }))
        .catch(() => ({ records: [], selector: selectorTrimmed }))
    : discoverDkim(domain, settings);

  const dnssecPromise = queryDNS(domain, 'DNSKEY', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl)
    .then(res => res.records && res.records.length > 0)
    .catch(() => false);

  const [authResults, mxResult, dkimResult, dnssecActive] = await Promise.all([
    Promise.all(promises),
    mxPromise,
    dkimPromise,
    dnssecPromise
  ]);

  const results = [
    ...authResults,
    mxResult,
    { type: 'DKIM', records: dkimResult.records, raw: dkimResult.records }
  ];

  const selectorUsed = dkimResult.selector;

  const mx = mxResult.records;
  if (mx.length === 0) {
    score -= 30;
    recommendations.push({ level: 'critical', msg: "No MX records found. You cannot receive email on this domain." });
  } else {
    recommendations.push({ level: 'good', msg: "MX records are properly configured." });
  }

  const spf = results.find(r => r.type === 'SPF')?.records || [];
  if (spf.length === 0) {
    score -= 20;
    recommendations.push({ level: 'high', msg: "Missing SPF record. Your emails are highly likely to go to spam." });
  } else if (spf.length > 1) {
    score -= 30;
    recommendations.push({ level: 'critical', msg: "Multiple SPF records found. This violates RFC and breaks delivery." });
  } else {
    const spfData = extractTxt(spf[0]);
    if (spfData.includes('+all')) {
      score -= 30;
      recommendations.push({ level: 'critical', msg: "SPF allows any IP (+all). This is extremely dangerous." });
    } else if (spfData.includes('?all')) {
      score -= 5;
      recommendations.push({ level: 'medium', msg: "SPF uses ?all (Neutral). Consider stricter ~all or -all." });
    } else {
      recommendations.push({ level: 'good', msg: "SPF record is present and well-formed." });
    }

    // SPF include validation
    const spfValidation = await validateSpfIncludes(spfData, settings);
    if (!spfValidation.valid) {
      score -= 10;
      spfValidation.errors.forEach(err => {
        recommendations.push({ level: 'high', msg: `SPF include verification: ${err}` });
      });
    }
  }

  const dmarc = results.find(r => r.type === 'DMARC')?.records || [];
  if (dmarc.length === 0) {
    score -= 20;
    recommendations.push({ level: 'high', msg: "Missing DMARC record. Phishers can easily spoof your domain." });
  } else if (dmarc.length > 1) {
    score -= 30;
    recommendations.push({ level: 'critical', msg: "Multiple DMARC records found. This invalidates the policy." });
  } else {
    const dmarcData = extractTxt(dmarc[0]);
    if (dmarcData.includes('p=none')) {
      score -= 5;
      recommendations.push({ level: 'medium', msg: "DMARC is set to p=none (Monitoring). Consider enforcing quarantine or reject." });
    } else {
      recommendations.push({ level: 'good', msg: "DMARC enforcement policy is active." });
    }

    // DMARC syntax validation
    const dmarcValidation = validateDmarcSyntax(dmarcData);
    if (!dmarcValidation.valid) {
      score -= 10;
      dmarcValidation.errors.forEach(err => {
        recommendations.push({ level: 'high', msg: `DMARC syntax issue: ${err}` });
      });
    }
  }

  const dkim = dkimResult.records;
  if (dkim.length === 0) {
    score -= 5;
    recommendations.push({ level: 'medium', msg: `No DKIM record found for selector '${selectorUsed}'.` });
  } else {
    recommendations.push({ level: 'good', msg: `DKIM record found for selector '${selectorUsed}'.` });
  }

  const bimi = results.find(r => r.type === 'BIMI')?.records || [];
  if (bimi.length === 0) {
    recommendations.push({ level: 'low', msg: "No BIMI record found. Add BIMI to show your brand logo in supported email clients." });
  } else {
    recommendations.push({ level: 'good', msg: "BIMI record is configured." });
  }

  const mtasts = results.find(r => r.type === 'MTA-STS')?.records || [];
  if (mtasts.length === 0) {
    recommendations.push({ level: 'low', msg: "No MTA-STS record. Adding this enforces TLS encryption for inbound email." });
  } else {
    recommendations.push({ level: 'good', msg: "MTA-STS is configured." });
  }

  const tlsrpt = results.find(r => r.type === 'TLSRPT')?.records || [];
  if (tlsrpt.length === 0) {
    recommendations.push({ level: 'low', msg: "No TLSRPT record. Adding this enables reporting for TLS connection failures." });
  } else {
    recommendations.push({ level: 'good', msg: "TLS Reporting (TLSRPT) is configured." });
  }

  if (dnssecActive) {
    score += 5;
    recommendations.push({ level: 'good', msg: "DNSSEC is enabled for this domain, protecting authentication DNS records." });
  }

  score = Math.max(0, Math.min(100, score));
  let grade = 'F';
  if (score >= 95) grade = 'A+';
  else if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';

  return {
    score,
    grade,
    results,
    recommendations
  };
}