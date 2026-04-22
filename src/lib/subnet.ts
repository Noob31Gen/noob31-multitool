export function ipv4ToLong(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) throw new Error("Invalid IPv4 address format");
  
  return parts.reduce((acc, octet) => {
    const val = parseInt(octet, 10);
    if (isNaN(val) || val < 0 || val > 255) throw new Error("Invalid IPv4 octet");
    return (acc << 8) + val;
  }, 0) >>> 0;
}

export function longToIpv4(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
}

export function calculateSubnet(ip: string, cidr: number) {
  if (cidr < 0 || cidr > 32) throw new Error("CIDR must be between 0 and 32");
  
  const ipLong = ipv4ToLong(ip);
  const maskLong = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  const networkLong = (ipLong & maskLong) >>> 0;
  const broadcastLong = (networkLong | ~maskLong) >>> 0;
  
  const totalHosts = cidr === 32 ? 1 : cidr === 31 ? 2 : (broadcastLong - networkLong - 1);
  const firstHost = cidr >= 31 ? networkLong : networkLong + 1;
  const lastHost = cidr >= 31 ? broadcastLong : broadcastLong - 1;

  const wildcardLong = (~maskLong) >>> 0;

  return {
    ip,
    cidr,
    mask: longToIpv4(maskLong),
    network: longToIpv4(networkLong),
    broadcast: longToIpv4(broadcastLong),
    firstHost: longToIpv4(firstHost),
    lastHost: longToIpv4(lastHost),
    totalHosts,
    wildcard: longToIpv4(wildcardLong),
    maskBinary: (maskLong >>> 0).toString(2).padStart(32, '0').match(/.{1,8}/g)?.join('.')
  };
}
