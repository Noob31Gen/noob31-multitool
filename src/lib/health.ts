import { queryDNS } from "./doh";
import { formatEmailAuthQuery, filterEmailAuthRecords } from "./emailAuthParsers";
import type { AppSettings } from "./settings";
export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';
function isValidFQDN(domain: string): boolean {
  const fqdnRegex = /^(?=.{1,253}$)(?:(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$/;
  return fqdnRegex.test(domain);
}
const extractTxt = (record: any): string => {
  if (!record) return "";
  if (typeof record === 'string') return record.toLowerCase();
  return String(record.data || record.value || "").toLowerCase();
};
export async function runDnsCheck(domain: string, settings: AppSettings) {
  domain = domain.trim();
  const types = ['A', 'AAAA', 'MX', 'NS', 'SOA', 'TXT', 'CNAME'];
  const promises = types.map(type =>
    queryDNS(domain, type, settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl)
      .then(res => ({ type, success: true, data: res }))
      .catch(err => ({ type, success: false, error: err.message }))
  );
  return Promise.all(promises);
}
export async function runDomainHealth(domain: string, selector: string, settings: AppSettings) {
  domain = domain.trim();
  selector = selector || 'default';
  const recommendations: { level: 'critical' | 'high' | 'medium' | 'low' | 'good', msg: string }[] = [];
  if (!isValidFQDN(domain)) {
    recommendations.push({ level: 'critical', msg: 'Invalid domain format.' });
    return {
      score: 0,
      grade: 'F' as HealthGrade,
      dnsResults: [],
      emailResults: [],
      recommendations,
      error: 'Invalid domain format'
    };
  }
  const dnsChecks = runDnsCheck(domain, settings);
  const emailAuthTypes = ['SPF', 'DKIM', 'DMARC', 'BIMI', 'MTA-STS', 'TLSRPT'];
  const emailPromises = emailAuthTypes.map(type => {
    const target = formatEmailAuthQuery(domain, type, selector);
    return queryDNS(target, 'TXT', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl)
      .then(res => {
        const filtered = filterEmailAuthRecords(res.records, type);
        return { type, success: true, records: filtered, allRecords: res.records, rawResponse: res };
      })
      .catch(err => ({ type, success: false, error: err.message, records: [], allRecords: [] }));
  });
  const [dnsResults, emailResults] = await Promise.all([dnsChecks, Promise.all(emailPromises)]);
  let score = 100;
  const soaResult = dnsResults.find(r => r.type === 'SOA');
  const soaRecords = (soaResult && 'data' in soaResult) ? soaResult.data?.records || [] : [];
  if (soaRecords.length === 0) {
    score -= 15;
    recommendations.push({ level: 'critical', msg: "Missing SOA record. Domain zone is invalid or non-functional." });
  } else {
    recommendations.push({ level: 'good', msg: "SOA record is present." });
  }
  const nsResult = dnsResults.find(r => r.type === 'NS');
  const nsRecords = (nsResult && 'data' in nsResult) ? nsResult.data?.records || [] : [];
  if (nsRecords.length === 0) {
    score -= 15;
    recommendations.push({ level: 'critical', msg: "Missing NS records. Domain cannot be resolved." });
  } else {
    recommendations.push({ level: 'good', msg: "NS records are present." });
  }
  const spfResult = emailResults.find(r => r.type === 'SPF');
  const spfRecords = spfResult?.records || [];
  if (spfRecords.length === 0) {
    score -= 30;
    recommendations.push({ level: 'high', msg: "Missing SPF record. Domain is vulnerable to spoofing." });
  } else if (spfRecords.length > 1) {
    score -= 30;
    recommendations.push({ level: 'critical', msg: "Multiple SPF records found. This breaks email authentication." });
  } else {
    const spfValue = extractTxt(spfRecords[0]);
    if (spfValue.includes('+all')) {
      score -= 25;
      recommendations.push({ level: 'critical', msg: "SPF allows any IP (+all). Critical security risk." });
    } else if (spfValue.includes('?all')) {
      score -= 15;
      recommendations.push({ level: 'medium', msg: "SPF uses ?all (Neutral). Does not actively prevent spoofing." });
    } else if (spfValue.includes('~all')) {
      score -= 5;
      recommendations.push({ level: 'low', msg: "SPF uses ~all (Softfail). Standard, but -all (Hardfail) is stricter." });
    } else {
      recommendations.push({ level: 'good', msg: "SPF is properly secured with -all (Hardfail)." });
    }
  }
  const dmarcResult = emailResults.find(r => r.type === 'DMARC');
  const dmarcRecords = dmarcResult?.records || [];
  if (dmarcRecords.length === 0) {
    score -= 30;
    recommendations.push({ level: 'high', msg: "Missing DMARC record. No policy enforcement for spoofed emails." });
  } else if (dmarcRecords.length > 1) {
    score -= 30;
    recommendations.push({ level: 'critical', msg: "Multiple DMARC records found. This invalidates the policy." });
  } else {
    const dmarcValue = extractTxt(dmarcRecords[0]);
    if (dmarcValue.includes('p=none')) {
      score -= 20;
      recommendations.push({ level: 'medium', msg: "DMARC is set to p=none (Monitoring). It does not block malicious emails." });
    } else if (dmarcValue.includes('p=quarantine')) {
      score -= 5;
      recommendations.push({ level: 'low', msg: "DMARC set to quarantine. Good, but p=reject is the ultimate goal." });
    } else {
      recommendations.push({ level: 'good', msg: "DMARC set to reject. Maximum protection active." });
    }
  }
  const dkimResult = emailResults.find(r => r.type === 'DKIM');
  const dkimRecords = dkimResult?.records || [];
  if (dkimRecords.length === 0) {
    score -= 10;
    recommendations.push({ level: 'medium', msg: `No DKIM record found at selector '${selector}'.` });
  } else {
    const dkimValue = extractTxt(dkimRecords[0]);
    if (!dkimValue.includes('v=dkim1') || !dkimValue.includes('p=')) {
      score -= 10;
      recommendations.push({ level: 'medium', msg: "DKIM record is malformed. Missing v=DKIM1 or p= tag." });
    } else {
      recommendations.push({ level: 'good', msg: "DKIM record is present and well-formed." });
    }
  }
  score = Math.max(0, score);
  let grade: HealthGrade = 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  return {
    score,
    grade,
    dnsResults,
    emailResults,
    recommendations
  };
}