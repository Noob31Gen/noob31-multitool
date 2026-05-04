import { getProxiedUrl, authenticatedFetch, type CorsProvider } from "./cors";
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
  const url = `https://www.macvendorlookup.com/api/v2/${oui}`;
  const proxiedUrl = getProxiedUrl(url, corsProvider, customCorsUrl);
  const firstByteHex = oui.substring(0, 2);
  const firstByteInt = parseInt(firstByteHex, 16);
  const binary = firstByteInt.toString(2).padStart(8, '0');
  const isUnicast = binary[7] === '0';
  const isUniversal = binary[6] === '0';
  try {
    const response = await authenticatedFetch(proxiedUrl);
    const queryTime = Date.now() - startTime;
    if (response.status === 404 || response.status === 204) {
      return {
        mac,
        vendor: "Unknown Vendor / Not Assigned",
        oui,
        success: true,
        isUnicast,
        isUniversal,
        binary,
        queryTime,
      };
    }
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const entry = data[0];
      return {
        mac,
        vendor: entry.company || "Unknown",
        address: [entry.addressL1, entry.addressL2, entry.addressL3].filter(Boolean).join(", "),
        country: entry.country,
        range: {
          start: entry.startHex,
          end: entry.endHex,
        },
        blockType: entry.type,
        category: getVendorCategory(entry.company || ""),
        oui,
        success: true,
        isUnicast,
        isUniversal,
        binary,
        queryTime,
      };
    }
    return {
      mac,
      vendor: "Unknown Vendor",
      oui,
      success: true,
      isUnicast,
      isUniversal,
      binary,
      queryTime,
    };
  } catch (error: any) {
    return {
      mac,
      vendor: "",
      oui,
      success: false,
      isUnicast: true,
      isUniversal: true,
      binary: "",
      error: error.message || "Failed to lookup MAC address.",
      queryTime: Date.now() - startTime,
    };
  }
}