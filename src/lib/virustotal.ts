import type { AppSettings } from "./settings";
import { getProxiedUrl } from "./cors"; // Add this import

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

      // Robust Details
      categories?: Record<string, string>;
      html_meta?: Record<string, string[]>;
      trackers?: Record<string, any[]>;
      last_http_response_code?: number;
      last_http_response_content_length?: number;
      last_http_response_content_sha256?: string;
      last_http_response_headers?: Record<string, string>;
      last_final_url?: string;
      redirection_chain?: string[];
      outgoing_links?: string[];
    }
  }
}

export async function getVirusTotalReport(url: string, settings: AppSettings): Promise<VTReport | null> {
  const apiKey = settings.apiKeys.virustotal;
  if (!apiKey) {
    throw new Error("VirusTotal API Key is missing. Configure it in Settings.");
  }

  const urlId = btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const targetUrl = `https://www.virustotal.com/api/v3/urls/${urlId}`;

  let fetchUrl = targetUrl;

  // Use the imported function instead of duplicating logic
  if ('corsProvider' in settings && settings.corsProvider) {
    fetchUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
  } else if ((settings as any).corsProxyUrl) {
    // Fallback for older settings formats
    fetchUrl = `${(settings as any).corsProxyUrl}${encodeURIComponent(targetUrl)}`;
  }

  try {
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey,
        'Accept': 'application/json'
      }
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.error("Non-JSON response:", await response.text());
      throw new Error(`The CORS proxy returned an HTML page instead of data. It likely stripped the API key or blocked the request.`);
    }

    if (response.status === 404) {
      return null;
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