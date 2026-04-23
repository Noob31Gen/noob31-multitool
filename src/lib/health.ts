import { queryDNS } from "./doh";
import { formatEmailAuthQuery, filterEmailAuthRecords } from "./emailAuthParsers";
import type { AppSettings } from "./settings";

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

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

  // Very basic scoring algorithm
  let score = 100;

  // Evaluate DNS
  const soaResult = dnsResults.find(r => r.type === 'SOA');
  const hasSOA = (soaResult && 'data' in soaResult) ? (soaResult.data?.records?.length || 0) > 0 : false;
  if (!hasSOA) score -= 15;

  const nsResult = dnsResults.find(r => r.type === 'NS');
  const hasNS = (nsResult && 'data' in nsResult) ? (nsResult.data?.records?.length || 0) > 0 : false;
  if (!hasNS) score -= 15;

  // Evaluate Email Auth
  const hasSPF = (emailResults.find(r => r.type === 'SPF')?.records?.length || 0) > 0;
  if (!hasSPF) score -= 20;
  const hasDMARC = (emailResults.find(r => r.type === 'DMARC')?.records?.length || 0) > 0;
  if (!hasDMARC) score -= 20;

  // DKIM uses a selector, so a missing DKIM record might just mean wrong selector.
  const hasDKIM = (emailResults.find(r => r.type === 'DKIM')?.records?.length || 0) > 0;
  if (!hasDKIM) score -= 5;

  // Clamp score
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
    emailResults
  }
}
