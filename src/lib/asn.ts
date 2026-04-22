import type { AppSettings } from "./settings"

export async function queryASN(ipOrAsn: string, settings: AppSettings) {
  ipOrAsn = ipOrAsn.trim().toUpperCase();
  
  let url: string;
  if (ipOrAsn === '') {
    url = `https://ipinfo.io/json`;
  } else {
    url = `https://ipinfo.io/${ipOrAsn}/json`;
  }
  if (settings.apiKeys.ipinfo) {
    url += `?token=${settings.apiKeys.ipinfo}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    // ipinfo.io supports CORS out of the box
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err: any) {
    throw err;
  }
}
