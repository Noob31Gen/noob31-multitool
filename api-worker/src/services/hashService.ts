export interface HashAnalysisResult {
  input: string;
  identifiedTypes: string[];
  generatedHashes?: {
    sha1: string;
    sha256: string;
    sha384: string;
    sha512: string;
  };
}

export function identifyHashType(hashStr: string): string[] {
  const clean = hashStr.trim();
  const hexMatch = /^[a-fA-F0-9]+$/.test(clean);
  const results: string[] = [];

  if (hexMatch) {
    switch (clean.length) {
      case 8:
        results.push('CRC32', 'Adler32');
        break;
      case 32:
        results.push('MD5', 'NTLM', 'MD4', 'RIPEMD-128');
        break;
      case 40:
        results.push('SHA-1', 'RIPEMD-160', 'MySQL 4.1+');
        break;
      case 56:
        results.push('SHA-224', 'SHA3-224');
        break;
      case 64:
        results.push('SHA-256', 'SHA3-256', 'BLAKE2s-256', 'HMAC-SHA256');
        break;
      case 96:
        results.push('SHA-384', 'SHA3-384');
        break;
      case 128:
        results.push('SHA-512', 'SHA3-512', 'BLAKE2b-512', 'Whirlpool');
        break;
    }
  }

  if (clean.startsWith('$2a$') || clean.startsWith('$2b$') || clean.startsWith('$2y$')) {
    results.push('bcrypt');
  }
  if (clean.startsWith('$argon2i$') || clean.startsWith('$argon2id$') || clean.startsWith('$argon2d$')) {
    results.push('Argon2');
  }
  if (clean.startsWith('$6$')) {
    results.push('SHA-512 Crypt (Unix)');
  }
  if (clean.startsWith('$5$')) {
    results.push('SHA-256 Crypt (Unix)');
  }
  if (clean.startsWith('$1$')) {
    results.push('MD5 Crypt (Unix)');
  }

  return results.length > 0 ? results : ['Unknown / Custom Hash Format'];
}

export async function generateHashes(text: string): Promise<{
  sha1: string;
  sha256: string;
  sha384: string;
  sha512: string;
}> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const digestToHex = async (algo: string) => {
    const buffer = await crypto.subtle.digest(algo, data);
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const [sha1, sha256, sha384, sha512] = await Promise.all([
    digestToHex('SHA-1'),
    digestToHex('SHA-256'),
    digestToHex('SHA-384'),
    digestToHex('SHA-512')
  ]);

  return { sha1, sha256, sha384, sha512 };
}
