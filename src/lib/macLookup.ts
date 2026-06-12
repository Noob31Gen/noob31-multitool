import { getProxiedUrl, authenticatedFetch, type CorsProvider } from "./cors";
import { logger } from "./logger";

export interface MacLookupResponse {
  mac: string;
  vendor: string;
  address?: string;
  country?: string;
  range?: {
    start: string;
    end: string;
  };
  blockType?: string;
  category?: string;
  oui: string;
  success: boolean;
  isUnicast: boolean;
  isUniversal: boolean;
  binary: string;
  error?: string;
  queryTime: number;
}

export function getVendorCategory(vendor: string): string {
  const v = vendor.toLowerCase();
  if (v.includes("cisco") || v.includes("tp-link") || v.includes("d-link") || v.includes("ubiquiti") || v.includes("mikrotik") || v.includes("netgear") || v.includes("linksys") || v.includes("juniper") || v.includes("arista") || v.includes("huawei") || v.includes("zte") || v.includes("belkin")) {
    return "Networking / Infrastructure";
  }
  if (v.includes("apple") || v.includes("samsung") || v.includes("google") || v.includes("motorola") || v.includes("htc") || v.includes("blackberry") || v.includes("nokia") || v.includes("lg electronics") || v.includes("sony mobile")) {
    return "Mobile / Consumer Electronics";
  }
  if (v.includes("dell") || v.includes("hp inc") || v.includes("hewlett packard") || v.includes("lenovo") || v.includes("acer") || v.includes("asus") || v.includes("toshiba") || v.includes("fujitsu") || v.includes("msi")) {
    return "Computing / Laptops";
  }
  if (v.includes("sony interactive") || v.includes("nintendo") || v.includes("microsoft") || v.includes("nvidia") || v.includes("valve") || v.includes("sega")) {
    return "Gaming / Multimedia";
  }
  if (v.includes("honeywell") || v.includes("nest") || v.includes("ring") || v.includes("wyze") || v.includes("philips hue") || v.includes("tuya") || v.includes("espressif") || v.includes("xiaomi")) {
    return "IoT / Smart Home";
  }
  if (v.includes("vmware") || v.includes("virtualbox") || v.includes("proxmox") || v.includes("xen") || v.includes("parallels") || v.includes("amazon data") || v.includes("google cloud") || v.includes("microsoft corporation")) {
    return "Virtualization / Cloud";
  }
  if (v.includes("intel") || v.includes("realtek") || v.includes("broadcom") || v.includes("qualcomm") || v.includes("atheros") || v.includes("mediatek") || v.includes("texas instruments")) {
    return "Network Chipset / Component";
  }
  return "General Electronics";
}

export function formatMac(mac: string): string {
  return mac.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
}

export function isValidMac(mac: string): boolean {
  const clean = formatMac(mac);
  return clean.length === 6 || clean.length === 12;
}

export async function lookupMac(
  mac: string,
  corsProvider: CorsProvider = "corsproxy",
  customCorsUrl: string = ""
): Promise<MacLookupResponse> {
  const startTime = Date.now();
  const cleanMac = formatMac(mac);
  
  if (cleanMac.length < 6) {
    throw new Error("Please enter at least the first 6 characters (OUI) of a MAC address.");
  }
  const oui = cleanMac.substring(0, 6);
  
  const firstByteHex = oui.substring(0, 2);
  const firstByteInt = parseInt(firstByteHex, 16);
  const binary = firstByteInt.toString(2).padStart(8, '0');
  const isUnicast = binary[7] === '0';
  const isUniversal = binary[6] === '0';

  // Private/locally-administered MAC check (Randomized MAC check)
  if (!isUniversal) {
    return {
      mac,
      vendor: "Locally Administered / Randomized MAC (No OUI Vendor)",
      address: "Locally Administered MAC addresses are generated dynamically by software (like Android, iOS, or Windows MAC Randomization) and do not map to a hardware vendor registry.",
      country: "N/A",
      oui,
      success: true,
      isUnicast,
      isUniversal,
      binary,
      queryTime: Date.now() - startTime,
    };
  }

  const apiSources: (() => Promise<{
    vendor: string;
    address?: string;
    country?: string;
    range?: { start: string; end: string };
    blockType?: string;
  }>)[] = [
    // Source 1: macvendorlookup.com
    async () => {
      const url = `https://www.macvendorlookup.com/api/v2/${oui}`;
      const proxiedUrl = getProxiedUrl(url, corsProvider, customCorsUrl);
      const res = await authenticatedFetch(proxiedUrl);
      if (res.status === 404 || res.status === 204) return { vendor: "Unknown Vendor / Not Assigned" };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const entry = data[0];
        return {
          vendor: entry.company || "Unknown",
          address: [entry.addressL1, entry.addressL2, entry.addressL3].filter(Boolean).join(", "),
          country: entry.country,
          range: { start: entry.startHex, end: entry.endHex },
          blockType: entry.type
        };
      }
      throw new Error("Invalid response format");
    },
    // Source 2: maclookup.app
    async () => {
      const url = `https://api.maclookup.app/v2/macs/${oui}`;
      const proxiedUrl = getProxiedUrl(url, corsProvider, customCorsUrl);
      const res = await authenticatedFetch(proxiedUrl);
      if (res.status === 404 || res.status === 204) return { vendor: "Unknown Vendor / Not Assigned" };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.found) {
        return {
          vendor: data.company || "Unknown",
          address: data.address || "",
          country: data.country || "",
          blockType: data.blockType || ""
        };
      }
      return { vendor: "Unknown Vendor / Not Assigned" };
    },
    // Source 3: macvendors.com
    async () => {
      const url = `https://api.macvendors.com/${oui}`;
      const proxiedUrl = getProxiedUrl(url, corsProvider, customCorsUrl);
      const res = await authenticatedFetch(proxiedUrl);
      if (res.status === 404 || res.status === 204) return { vendor: "Unknown Vendor / Not Assigned" };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text && text.trim() && !text.includes("errors")) {
        return {
          vendor: text.trim(),
          address: "",
          country: "",
          blockType: ""
        };
      }
      return { vendor: "Unknown Vendor / Not Assigned" };
    }
  ];

  let lastError: Error | null = null;
  for (const fetchOui of apiSources) {
    try {
      const details = await fetchOui();
      const queryTime = Date.now() - startTime;
      return {
        mac,
        vendor: details.vendor,
        address: details.address,
        country: details.country,
        range: details.range,
        blockType: details.blockType,
        category: getVendorCategory(details.vendor),
        oui,
        success: true,
        isUnicast,
        isUniversal,
        binary,
        queryTime
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.warn("MAC OUI API source failed, trying fallback...", err);
    }
  }

  return {
    mac,
    vendor: "",
    oui,
    success: false,
    isUnicast,
    isUniversal,
    binary,
    error: lastError?.message || "All MAC vendor lookup sources failed.",
    queryTime: Date.now() - startTime
  };
}