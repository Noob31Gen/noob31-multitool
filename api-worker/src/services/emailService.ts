import { lookupDns } from './dnsService';
import type { EmailAuthResult } from '../types';

export async function checkEmailAuth(domain: string, dkimSelector?: string): Promise<EmailAuthResult> {
  const cleanDomain = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');

  // 1. Check SPF
  let spfRecord: string | undefined;
  let spfValid = false;
  const spfMechanisms: string[] = [];
  let spfQualifier: string | undefined;
  const spfWarnings: string[] = [];

  try {
    const txtRes = await lookupDns(cleanDomain, 'TXT', 'auto');
    const spfMatch = txtRes.records.find(r => r.data.includes('v=spf1'));
    if (spfMatch) {
      spfRecord = spfMatch.data.replace(/^"|"$/g, '').replace(/"\s*"/g, '');
      spfValid = true;

      const tokens = spfRecord.split(/\s+/);
      tokens.slice(1).forEach(tok => {
        if (tok.startsWith('include:') || tok.startsWith('ip4:') || tok.startsWith('ip6:') || tok.startsWith('a') || tok.startsWith('mx') || tok.startsWith('redirect=')) {
          spfMechanisms.push(tok);
        } else if (tok.endsWith('all')) {
          spfQualifier = tok;
        }
      });

      if (!spfQualifier) {
        spfWarnings.push('SPF record is missing an "all" mechanism (e.g., ~all or -all).');
      } else if (spfQualifier === '+all' || spfQualifier === '?all') {
        spfWarnings.push('SPF qualifier is neutral or permissive (+all or ?all), which weakens spam protection.');
      }
    } else {
      spfWarnings.push('No SPF (v=spf1) record found.');
    }
  } catch (err) {
    spfWarnings.push(`Failed to query SPF DNS records: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Check DMARC
  let dmarcRecord: string | undefined;
  let dmarcValid = false;
  let dmarcPolicy: string | undefined;
  let dmarcSubdomainPolicy: string | undefined;
  let dmarcPercentage: number | undefined;
  const dmarcRua: string[] = [];
  const dmarcRuf: string[] = [];
  const dmarcWarnings: string[] = [];

  try {
    const dmarcRes = await lookupDns(`_dmarc.${cleanDomain}`, 'TXT', 'auto');
    const dmarcMatch = dmarcRes.records.find(r => r.data.includes('v=DMARC1'));
    if (dmarcMatch) {
      dmarcRecord = dmarcMatch.data.replace(/^"|"$/g, '').replace(/"\s*"/g, '');
      dmarcValid = true;

      const tags = dmarcRecord.split(';').map(t => t.trim()).filter(Boolean);
      tags.forEach(tag => {
        const [k, v] = tag.split('=').map(s => s.trim());
        if (!k || !v) return;
        const key = k.toLowerCase();
        if (key === 'p') dmarcPolicy = v.toLowerCase();
        else if (key === 'sp') dmarcSubdomainPolicy = v.toLowerCase();
        else if (key === 'pct') dmarcPercentage = parseInt(v, 10);
        else if (key === 'rua') dmarcRua.push(...v.split(',').map(s => s.trim()));
        else if (key === 'ruf') dmarcRuf.push(...v.split(',').map(s => s.trim()));
      });

      if (dmarcPolicy === 'none') {
        dmarcWarnings.push('DMARC policy is set to "p=none", which monitors only and does not reject spoofed emails.');
      }
      if (dmarcRua.length === 0) {
        dmarcWarnings.push('DMARC is missing an aggregate report recipient tag (rua=mailto:...).');
      }
    } else {
      dmarcWarnings.push('No DMARC (v=DMARC1) record found at _dmarc.' + cleanDomain);
    }
  } catch (err) {
    dmarcWarnings.push(`Failed to query DMARC DNS records: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Optional DKIM check
  let dkimResult: EmailAuthResult['dkim'] = undefined;
  if (dkimSelector) {
    const cleanSelector = dkimSelector.trim();
    try {
      const dkimRes = await lookupDns(`${cleanSelector}._domainkey.${cleanDomain}`, 'TXT', 'auto');
      const dkimMatch = dkimRes.records.find(r => r.data.includes('v=DKIM1') || r.data.includes('k=rsa') || r.data.includes('p='));
      dkimResult = {
        selector: cleanSelector,
        record: dkimMatch?.data.replace(/^"|"$/g, ''),
        valid: !!dkimMatch
      };
    } catch {
      dkimResult = {
        selector: cleanSelector,
        valid: false
      };
    }
  }

  return {
    domain: cleanDomain,
    spf: {
      record: spfRecord,
      valid: spfValid,
      mechanisms: spfMechanisms,
      qualifier: spfQualifier,
      warnings: spfWarnings.length > 0 ? spfWarnings : undefined
    },
    dmarc: {
      record: dmarcRecord,
      valid: dmarcValid,
      policy: dmarcPolicy,
      subdomainPolicy: dmarcSubdomainPolicy,
      percentage: dmarcPercentage,
      rua: dmarcRua.length > 0 ? dmarcRua : undefined,
      ruf: dmarcRuf.length > 0 ? dmarcRuf : undefined,
      warnings: dmarcWarnings.length > 0 ? dmarcWarnings : undefined
    },
    dkim: dkimResult
  };
}

export async function checkEmailDeliverability(domain: string): Promise<{
  domain: string;
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  mxRecords: { exchange: string; priority: number }[];
  auth: EmailAuthResult;
  recommendations: string[];
}> {
  const cleanDomain = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
  const auth = await checkEmailAuth(cleanDomain);

  let score = 0;
  const recommendations: string[] = [];

  // 1. Check MX records
  let mxRecords: { exchange: string; priority: number }[] = [];
  try {
    const mxRes = await lookupDns(cleanDomain, 'MX', 'auto');
    mxRecords = mxRes.records.map(r => {
      const parts = r.data.trim().split(/\s+/);
      return {
        priority: parseInt(parts[0] || '0', 10),
        exchange: (parts[1] || '').replace(/\.$/, '')
      };
    });
  } catch {
    // no MX
  }

  if (mxRecords.length > 0) {
    score += 40;
  } else {
    recommendations.push('Add valid MX records for this domain to receive mail.');
  }

  // 2. Score SPF
  if (auth.spf.valid) {
    score += 30;
    if (auth.spf.qualifier === '-all') score += 5;
  } else {
    recommendations.push('Create a valid SPF TXT record (e.g. v=spf1 include:... ~all).');
  }

  // 3. Score DMARC
  if (auth.dmarc.valid) {
    score += 15;
    if (auth.dmarc.policy === 'reject') score += 10;
    else if (auth.dmarc.policy === 'quarantine') score += 5;
  } else {
    recommendations.push('Publish a DMARC policy at _dmarc.' + cleanDomain + ' with reporting (rua=).');
  }

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (score >= 95) grade = 'A+';
  else if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 50) grade = 'C';
  else if (score >= 30) grade = 'D';

  return {
    domain: cleanDomain,
    score,
    grade,
    mxRecords,
    auth,
    recommendations
  };
}
