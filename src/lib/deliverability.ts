import { queryDNS } from "./doh";
import { formatEmailAuthQuery, filterEmailAuthRecords } from "./emailAuthParsers";
import type { AppSettings } from "./settings";
function isValidFQDN(domain: string): boolean {
  const fqdnRegex = /^(?=.{1,253}$)(?:(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$/;
  return fqdnRegex.test(domain);
}
const extractTxt = (record: any): string => {
  if (!record) return "";
  if (typeof record === 'string') return record.toLowerCase();
  return String(record.data || record.value || "").toLowerCase();
};
export async function runDeliverabilityCheck(domain: string, selector: string, settings: AppSettings) {
  domain = domain.trim();
  selector = selector || 'default';
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
  const types = ['SPF', 'DKIM', 'DMARC', 'BIMI', 'MTA-STS', 'TLSRPT'];
  const promises = types.map(type => {
    const target = formatEmailAuthQuery(domain, type, selector);
    return queryDNS(target, 'TXT', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl)
      .then(res => ({ type, records: filterEmailAuthRecords(res.records, type), raw: res.records }))
      .catch(() => ({ type, records: [], raw: [] }));
  });
  const mxPromise = queryDNS(domain, 'MX', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl)
    .then(res => ({ type: 'MX', records: res.records, raw: res.records }))
    .catch(() => ({ type: 'MX', records: [], raw: [] }));
  const results = await Promise.all([...promises, mxPromise]);
  const mx = results.find(r => r.type === 'MX')?.records || [];
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
  }
  const dkim = results.find(r => r.type === 'DKIM')?.records || [];
  if (dkim.length === 0) {
    score -= 5;
    recommendations.push({ level: 'medium', msg: `No DKIM record found for selector '${selector}'. If you use another selector, this is a false positive.` });
  } else {
    recommendations.push({ level: 'good', msg: `DKIM record found for selector '${selector}'.` });
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
  score = Math.max(0, score);
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
  }
}