import type { AppSettings } from "./settings"

export interface VTReport {
  data: {
    attributes: {
      last_analysis_stats: {
        harmless: number;
        malicious: number;
        suspicious: number;
        undetected: number;
        timeout: number;
      };
      last_analysis_results: Record<string, {
        category: string;
        result: string;
        method: string;
        engine_name: string;
      }>;
      reputation: number;
      first_submission_date?: number;
      last_submission_date?: number;
      last_analysis_date?: number;
    }
  }
}

export async function getVirusTotalReport(url: string, settings: AppSettings): Promise<VTReport | null> {
  const apiKey = settings.apiKeys.virustotal;
  if (!apiKey) {
    throw new Error("VirusTotal API Key is missing. Configure it in Settings.");
  }

  const urlId = btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  // Try directly first; VT v3 allows CORS for GET requests from browser
  // If we get a CORS error, we might fallback to proxy, but VT API requires API key so proxy might not be needed if they allow it.
  // Actually, VT API does NOT allow CORS. We must use the proxy.
  const targetUrl = `https://www.virustotal.com/api/v3/urls/${urlId}`;
  
  let fetchUrl = targetUrl;
  if (settings.corsProxyUrl) {
    fetchUrl = `${settings.corsProxyUrl}${encodeURIComponent(targetUrl)}`;
  }

  try {
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey,
        'Accept': 'application/json'
      }
    });

    if (response.status === 404) {
      return null; // No report found
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `VirusTotal API error: HTTP ${response.status}`);
    }

    const data: VTReport = await response.json();
    return data;
  } catch (error: any) {
    throw new Error(`Failed to fetch VirusTotal report: ${error.message}`);
  }
}
