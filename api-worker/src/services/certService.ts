import type { CertRecord } from '../types';

export async function lookupCertificates(domain: string): Promise<{ data: CertRecord[]; source: string; queryTimeMs: number }> {
  const startTime = performance.now();
  const cleanDomain = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');

  // 1. Try crt.sh
  const crtUrl = `https://crt.sh/?q=${encodeURIComponent(cleanDomain)}&output=json`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(crtUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json() as {
        issuer_ca_id?: number;
        issuer_name: string;
        common_name: string;
        name_value: string;
        id?: number;
        entry_timestamp?: string;
        not_before: string;
        not_after: string;
        serial_number?: string;
      }[];

      if (Array.isArray(data)) {
        return {
          data,
          source: 'crt.sh',
          queryTimeMs: Math.round(performance.now() - startTime)
        };
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  // 2. Fallback: CertSpotter
  const certSpotterUrl = `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(cleanDomain)}&include_subdomains=true&expand=dns_names&limit=25`;
  const csController = new AbortController();
  const csTimeoutId = setTimeout(() => csController.abort(), 4000);

  try {
    const csRes = await fetch(certSpotterUrl, { signal: csController.signal });
    clearTimeout(csTimeoutId);
    if (csRes.ok) {
      const csData = await csRes.json() as {
        id?: string;
        issuer?: { name?: string };
        dns_names?: string[];
        not_before?: string;
        not_after?: string;
      }[];

      const mapped: CertRecord[] = (csData || []).map(item => ({
        issuer_name: item.issuer?.name || 'Unknown Issuer',
        common_name: (item.dns_names && item.dns_names[0]) || cleanDomain,
        name_value: (item.dns_names || []).join('\n'),
        not_before: item.not_before ? new Date(item.not_before).toLocaleDateString() : 'N/A',
        not_after: item.not_after ? new Date(item.not_after).toLocaleDateString() : 'N/A'
      }));

      return {
        data: mapped,
        source: 'CertSpotter',
        queryTimeMs: Math.round(performance.now() - startTime)
      };
    }
  } catch {
    clearTimeout(csTimeoutId);
  }

  throw new Error(`Certificate lookup failed for ${cleanDomain}`);
}
