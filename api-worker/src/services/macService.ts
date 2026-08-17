import type { MacLookupResult } from '../types';

export function getVendorCategory(vendor: string): string {
  const v = vendor.toLowerCase();
  if (v.includes('cisco') || v.includes('tp-link') || v.includes('d-link') || v.includes('ubiquiti') || v.includes('mikrotik') || v.includes('netgear') || v.includes('linksys') || v.includes('juniper') || v.includes('arista') || v.includes('huawei') || v.includes('zte') || v.includes('belkin')) {
    return 'Networking / Infrastructure';
  }
  if (v.includes('apple') || v.includes('samsung') || v.includes('google') || v.includes('motorola') || v.includes('htc') || v.includes('blackberry') || v.includes('nokia') || v.includes('lg electronics') || v.includes('sony mobile')) {
    return 'Mobile / Consumer Electronics';
  }
  if (v.includes('dell') || v.includes('hp inc') || v.includes('hewlett packard') || v.includes('lenovo') || v.includes('acer') || v.includes('asus') || v.includes('toshiba') || v.includes('fujitsu') || v.includes('msi')) {
    return 'Computing / Laptops';
  }
  if (v.includes('sony interactive') || v.includes('nintendo') || v.includes('microsoft') || v.includes('nvidia') || v.includes('valve') || v.includes('sega')) {
    return 'Gaming / Multimedia';
  }
  if (v.includes('honeywell') || v.includes('nest') || v.includes('ring') || v.includes('wyze') || v.includes('philips hue') || v.includes('tuya') || v.includes('espressif') || v.includes('xiaomi')) {
    return 'IoT / Smart Home';
  }
  if (v.includes('vmware') || v.includes('virtualbox') || v.includes('proxmox') || v.includes('xen') || v.includes('parallels') || v.includes('amazon data') || v.includes('google cloud')) {
    return 'Virtualization / Cloud';
  }
  if (v.includes('intel') || v.includes('realtek') || v.includes('broadcom') || v.includes('qualcomm') || v.includes('atheros') || v.includes('mediatek') || v.includes('texas instruments')) {
    return 'Network Chipset / Component';
  }
  return 'General Electronics';
}

export function formatMac(mac: string): string {
  return mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
}

export async function lookupMacAddress(mac: string): Promise<MacLookupResult> {
  const startTime = performance.now();
  const cleanMac = formatMac(mac);

  if (cleanMac.length < 6) {
    throw new Error('Please enter at least the first 6 hex characters (OUI) of a MAC address');
  }

  const oui = cleanMac.substring(0, 6);
  const firstByteHex = oui.substring(0, 2);
  const firstByteInt = parseInt(firstByteHex, 16);
  const binary = firstByteInt.toString(2).padStart(8, '0');
  const isUnicast = binary[7] === '0';
  const isUniversal = binary[6] === '0';

  if (!isUniversal) {
    return {
      mac,
      oui,
      vendor: 'Locally Administered / Randomized MAC',
      address: 'Locally Administered MAC addresses are generated dynamically by software (iOS/Android/Windows MAC Randomization).',
      country: 'N/A',
      isUnicast,
      isUniversal,
      category: 'Virtual / Randomized',
      queryTimeMs: Math.round(performance.now() - startTime)
    };
  }

  const sources: (() => Promise<{
    vendor: string;
    address?: string;
    country?: string;
    range?: { start: string; end: string };
    blockType?: string;
  }>)[] = [
    // Source 1: maclookup.app
    async () => {
      const res = await fetch(`https://api.maclookup.app/v2/macs/${oui}`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.status === 404 || res.status === 204) return { vendor: 'Unknown Vendor / Not Assigned' };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { found?: boolean; company?: string; address?: string; country?: string; blockType?: string };
      if (data && data.found) {
        return {
          vendor: data.company || 'Unknown',
          address: data.address,
          country: data.country,
          blockType: data.blockType
        };
      }
      return { vendor: 'Unknown Vendor / Not Assigned' };
    },
    // Source 2: macvendorlookup.com
    async () => {
      const res = await fetch(`https://www.macvendorlookup.com/api/v2/${oui}`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.status === 404 || res.status === 204) return { vendor: 'Unknown Vendor / Not Assigned' };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { company?: string; addressL1?: string; addressL2?: string; country?: string; startHex?: string; endHex?: string; type?: string }[];
      if (Array.isArray(data) && data.length > 0) {
        const entry = data[0];
        return {
          vendor: entry.company || 'Unknown',
          address: [entry.addressL1, entry.addressL2].filter(Boolean).join(', '),
          country: entry.country,
          range: entry.startHex && entry.endHex ? { start: entry.startHex, end: entry.endHex } : undefined,
          blockType: entry.type
        };
      }
      throw new Error('Invalid format');
    },
    // Source 3: macvendors.com
    async () => {
      const res = await fetch(`https://api.macvendors.com/${oui}`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.status === 404 || res.status === 204) return { vendor: 'Unknown Vendor / Not Assigned' };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text && text.trim() && !text.includes('errors')) {
        return { vendor: text.trim() };
      }
      return { vendor: 'Unknown Vendor / Not Assigned' };
    }
  ];

  for (const src of sources) {
    try {
      const result = await src();
      return {
        mac,
        oui,
        vendor: result.vendor,
        address: result.address,
        country: result.country,
        range: result.range,
        blockType: result.blockType,
        category: getVendorCategory(result.vendor),
        isUnicast,
        isUniversal,
        queryTimeMs: Math.round(performance.now() - startTime)
      };
    } catch {
      // try next
    }
  }

  return {
    mac,
    oui,
    vendor: 'Unknown Vendor / Not Assigned',
    category: 'General Electronics',
    isUnicast,
    isUniversal,
    queryTimeMs: Math.round(performance.now() - startTime)
  };
}
