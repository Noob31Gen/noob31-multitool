export type CorsProvider = 'none' | 'allorigins' | 'codetabs' | 'thingproxy' | 'corsanywhere' | 'corsproxy' | 'custom';

export function getProxiedUrl(targetUrl: string, provider: CorsProvider, customProxyUrl: string = ''): string {
    if (provider === 'none') return targetUrl;

    let proxyBase = '';
    switch (provider) {
        case 'allorigins':
            proxyBase = 'https://api.allorigins.win/raw?url=';
            break;
        case 'codetabs':
            proxyBase = 'https://api.codetabs.com/v1/proxy?quest=';
            break;
        case 'thingproxy':
            proxyBase = 'https://thingproxy.freeboard.io/fetch/';
            break;
        case 'corsanywhere':
            proxyBase = 'https://cors-anywhere.herokuapp.com/';
            break;
        case 'corsproxy':
            proxyBase = 'https://corsproxy.io/?';
            break;
        case 'custom':
            proxyBase = customProxyUrl;
            break;
    }

    return proxyBase ? proxyBase + encodeURIComponent(targetUrl) : targetUrl;
}

/**
 * Performs a fetch through a CORS proxy if configured, handling authentication
 * by moving credentials from the URL to the Authorization header.
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let finalUrl = url;
    const finalOptions: RequestInit = { ...options };
    const headers = new Headers(finalOptions.headers || {});

    try {
        const u = new URL(url);
        if (u.username || u.password) {
            const auth = btoa(`${u.username}:${u.password}`);
            headers.set("Authorization", `Basic ${auth}`);
            u.username = "";
            u.password = "";
            finalUrl = u.toString();
        }
    } catch (e) {
        // Not an absolute URL
    }

    finalOptions.headers = headers;
    
    // Default to 'same-origin' to prevent CORS wildcard errors on public proxies.
    // We only upgrade to 'include' if credentials are found in the URL or explicitly requested.
    if (!options.credentials) {
        finalOptions.credentials = 'same-origin';
    }

    try {
        const u = new URL(url);
        if (u.username || u.password) {
            const auth = btoa(`${u.username}:${u.password}`);
            headers.set("Authorization", `Basic ${auth}`);
            
            // If creds are in the URL, it's an authenticated proxy request.
            // Upgrade to 'include' to allow browser-based auth handling/dialogs.
            if (!options.credentials) {
                finalOptions.credentials = 'include';
            }
            
            // Strip credentials from the URL for the actual fetch
            u.username = "";
            u.password = "";
            finalUrl = u.toString();
        }
    } catch (e) {
        // Not an absolute URL, keep same-origin mode and original finalUrl
    }
    
    return fetch(finalUrl, finalOptions);
}