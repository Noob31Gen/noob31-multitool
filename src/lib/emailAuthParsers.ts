export interface ParsedRecordField {
  key: string;
  value?: string;
  description?: string;
}

export function parseSPF(record: string): ParsedRecordField[] {
  // e.g. "v=spf1 include:_spf.google.com ~all"
  const parts = record.replace(/"/g, '').split(/\s+/).filter(Boolean);
  return parts.map(part => {
    if (part.startsWith('v=')) return { key: 'Version', value: part };
    if (part === '+all' || part === 'all') return { key: 'Mechanism', value: part, description: 'Allow all' };
    if (part === '-all') return { key: 'Mechanism', value: part, description: 'Hard fail' };
    if (part === '~all') return { key: 'Mechanism', value: part, description: 'Soft fail' };
    if (part === '?all') return { key: 'Mechanism', value: part, description: 'Neutral' };
    
    if (part.includes(':')) {
      const [k, ...rest] = part.split(':');
      return { key: k, value: rest.join(':') };
    }
    
    return { key: 'Mechanism', value: part };
  });
}

export function parseKeyValue(record: string): ParsedRecordField[] {
  // e.g. "v=DMARC1; p=reject; rua=mailto:dmarc@example.com"
  const parts = record.replace(/"/g, '').split(';').map(p => p.trim()).filter(Boolean);
  return parts.map(part => {
    if (part.includes('=')) {
      const [k, ...rest] = part.split('=');
      return { key: k.trim(), value: rest.join('=').trim() };
    }
    return { key: 'Unknown', value: part };
  });
}

export function formatEmailAuthQuery(domain: string, type: string, selector?: string): string {
  domain = domain.trim();
  switch (type) {
    case 'SPF': return domain;
    case 'DKIM': return `${selector || 'default'}._domainkey.${domain}`;
    case 'DMARC': return `_dmarc.${domain}`;
    case 'BIMI': return `${selector || 'default'}._bimi.${domain}`;
    case 'MTA-STS': return `_mta-sts.${domain}`;
    case 'TLSRPT': return `_smtp._tls.${domain}`;
    default: return domain;
  }
}

export function filterEmailAuthRecords(records: any[], type: string): any[] {
  if (!records) return [];
  const prefixMap: Record<string, string> = {
    'SPF': 'v=spf1',
    'DKIM': 'v=DKIM1',
    'DMARC': 'v=DMARC1',
    'BIMI': 'v=BIMI1',
    'MTA-STS': 'v=STSv1',
    'TLSRPT': 'v=TLSRPTv1'
  };
  
  const prefix = prefixMap[type];
  if (!prefix) return records;

  return records.filter(r => r.data && r.data.replace(/"/g, '').startsWith(prefix));
}
