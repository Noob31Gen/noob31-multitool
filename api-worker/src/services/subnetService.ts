export interface SubnetCalculationResult {
  cidr: string;
  ip: string;
  prefixLength: number;
  ipVersion: 4 | 6;
  networkAddress: string;
  broadcastAddress?: string;
  netmask: string;
  wildcardMask?: string;
  firstUsableIp?: string;
  lastUsableIp?: string;
  totalHosts: string;
  usableHosts: string;
  ipClass?: string;
  isPrivate: boolean;
  binaryNetmask?: string;
  ipv6Expanded?: string;
}

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
}

export function calculateSubnet(inputCidr: string): SubnetCalculationResult {
  const clean = inputCidr.trim();
  const [ipPart, prefixPart] = clean.split('/');

  if (!ipPart) {
    throw new Error('Invalid CIDR format. Expected format like "192.168.1.0/24" or "10.0.0.1"');
  }

  // IPv6 Calculation
  if (ipPart.includes(':')) {
    const prefix = prefixPart ? parseInt(prefixPart, 10) : 64;
    if (isNaN(prefix) || prefix < 0 || prefix > 128) {
      throw new Error('IPv6 prefix must be between 0 and 128');
    }

    // Expand IPv6
    const parts = ipPart.split('::');
    let fullHex = '';
    if (parts.length === 2) {
      const left = parts[0] ? parts[0].split(':') : [];
      const right = parts[1] ? parts[1].split(':') : [];
      const missing = 8 - (left.length + right.length);
      const zeros = Array(missing).fill('0000');
      const allParts = [...left, ...zeros, ...right].map(p => p.padStart(4, '0'));
      fullHex = allParts.join(':');
    } else {
      fullHex = ipPart.split(':').map(p => p.padStart(4, '0')).join(':');
    }

    const totalHosts = prefix === 128 ? '1' : `2^${128 - prefix}`;

    return {
      cidr: `${ipPart}/${prefix}`,
      ip: ipPart,
      prefixLength: prefix,
      ipVersion: 6,
      networkAddress: ipPart,
      netmask: `/${prefix}`,
      totalHosts,
      usableHosts: totalHosts,
      isPrivate: ipPart.startsWith('fd') || ipPart.startsWith('fc') || ipPart.startsWith('fe80'),
      ipv6Expanded: fullHex
    };
  }

  // IPv4 Calculation
  const prefix = prefixPart ? parseInt(prefixPart, 10) : 24;
  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    throw new Error('IPv4 subnet prefix must be between 0 and 32');
  }

  const ipNum = ipToLong(ipPart);
  const maskNum = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  const wildcardNum = (~maskNum) >>> 0;
  const netNum = (ipNum & maskNum) >>> 0;
  const broadcastNum = (netNum | wildcardNum) >>> 0;

  const totalHosts = Math.pow(2, 32 - prefix);
  const usableHosts = prefix >= 31 ? (prefix === 31 ? 2 : 1) : Math.max(0, totalHosts - 2);

  const firstUsableNum = prefix >= 31 ? netNum : netNum + 1;
  const lastUsableNum = prefix >= 31 ? broadcastNum : broadcastNum - 1;

  // Determine Class
  const firstOctet = parseInt(ipPart.split('.')[0], 10);
  let ipClass = 'A';
  if (firstOctet >= 128 && firstOctet <= 191) ipClass = 'B';
  else if (firstOctet >= 192 && firstOctet <= 223) ipClass = 'C';
  else if (firstOctet >= 224 && firstOctet <= 239) ipClass = 'D (Multicast)';
  else if (firstOctet >= 240) ipClass = 'E (Experimental)';

  // Private RFC 1918 check
  const isPrivate = (firstOctet === 10) ||
    (firstOctet === 172 && parseInt(ipPart.split('.')[1], 10) >= 16 && parseInt(ipPart.split('.')[1], 10) <= 31) ||
    (firstOctet === 192 && parseInt(ipPart.split('.')[1], 10) === 168) ||
    (firstOctet === 127);

  const binaryNetmask = maskNum.toString(2).padStart(32, '0').match(/.{8}/g)?.join('.') || '';

  return {
    cidr: `${ipPart}/${prefix}`,
    ip: ipPart,
    prefixLength: prefix,
    ipVersion: 4,
    networkAddress: longToIp(netNum),
    broadcastAddress: longToIp(broadcastNum),
    netmask: longToIp(maskNum),
    wildcardMask: longToIp(wildcardNum),
    firstUsableIp: longToIp(firstUsableNum),
    lastUsableIp: longToIp(lastUsableNum),
    totalHosts: totalHosts.toLocaleString(),
    usableHosts: usableHosts.toLocaleString(),
    ipClass,
    isPrivate,
    binaryNetmask
  };
}
