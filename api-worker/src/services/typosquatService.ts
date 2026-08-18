import { lookupDns } from './dnsService';

export interface TyposquatCandidate {
  domain: string;
  type: 'omission' | 'substitution' | 'repetition' | 'hyphenation' | 'tld-swap';
  hasDns: boolean;
  ip?: string;
}

export interface TyposquatResult {
  originalDomain: string;
  totalVariationsChecked: number;
  activeRegisteredCount: number;
  candidates: TyposquatCandidate[];
  queryTimeMs: number;
}

const COMMON_TLDS = ['com', 'net', 'org', 'co', 'io', 'info', 'xyz', 'app', 'online', 'top'];

const HOMOGLYPHS: Record<string, string[]> = {
  'o': ['0', 'oo'],
  'l': ['1', 'i', 'll'],
  'i': ['1', 'l'],
  'e': ['3'],
  'a': ['4', 'q'],
  's': ['5', 'z'],
  'g': ['9', 'q'],
  't': ['7']
};

export async function detectTyposquatting(domain: string, maxChecks: number = 15): Promise<TyposquatResult> {
  const startTime = performance.now();
  const clean = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
  const parts = clean.split('.');
  const sld = parts[0];
  const tld = parts.slice(1).join('.');

  const variationMap = new Map<string, TyposquatCandidate['type']>();

  // 1. Omission
  for (let i = 0; i < sld.length; i++) {
    const omitted = sld.slice(0, i) + sld.slice(i + 1);
    if (omitted.length >= 3) {
      variationMap.set(`${omitted}.${tld}`, 'omission');
    }
  }

  // 2. Homoglyphs
  for (let i = 0; i < sld.length; i++) {
    const char = sld[i];
    const replacements = HOMOGLYPHS[char];
    if (replacements) {
      replacements.forEach(rep => {
        const substituted = sld.slice(0, i) + rep + sld.slice(i + 1);
        variationMap.set(`${substituted}.${tld}`, 'substitution');
      });
    }
  }

  // 3. TLD Swaps
  COMMON_TLDS.forEach(otherTld => {
    if (otherTld !== tld) {
      variationMap.set(`${sld}.${otherTld}`, 'tld-swap');
    }
  });

  // Limit check volume
  const variationsToCheck = Array.from(variationMap.entries()).slice(0, maxChecks);

  const results: TyposquatCandidate[] = await Promise.all(
    variationsToCheck.map(async ([variantDomain, type]) => {
      try {
        const dns = await lookupDns(variantDomain, 'A', 'cloudflare');
        const aRecord = dns.records.find(r => r.typeName === 'A');
        return {
          domain: variantDomain,
          type,
          hasDns: !!aRecord,
          ip: aRecord?.data
        };
      } catch {
        return {
          domain: variantDomain,
          type,
          hasDns: false
        };
      }
    })
  );

  const active = results.filter(r => r.hasDns).length;

  return {
    originalDomain: clean,
    totalVariationsChecked: results.length,
    activeRegisteredCount: active,
    candidates: results,
    queryTimeMs: Math.round(performance.now() - startTime)
  };
}
