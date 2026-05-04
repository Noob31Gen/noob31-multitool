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
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let finalUrl = url;
    const finalOptions: RequestInit = { ...options };
    const headers = new Headers(finalOptions.headers || {});

    try {
        const u = new URL(url);
        if (u.username || u.password) {
            const auth = btoa(`${u.username}:${u.password}`);
            headers.set("Authorization", `Basic ${auth}`);
            
            // If authentication is embedded in the URL, we typically need 'include' 
            // to ensure credentials (like cookies/headers) are passed through CORS proxies correctly
            if (!options.credentials) {
                finalOptions.credentials = 'include';
            }
            
            u.username = "";
            u.password = "";
            finalUrl = u.toString();
        }
    } catch {
        // Fallback if URL parsing fails
    }

    finalOptions.headers = headers;
    if (!finalOptions.credentials) {
        finalOptions.credentials = 'same-origin';
    }

    return fetch(finalUrl, finalOptions);
}

/**
 * Reverses getProxiedUrl to extract the original target URL from a proxied URL.
 * Useful for detecting the final destination after redirects when a proxy is involved.
 */
export function extractTargetUrl(proxiedUrl: string, provider: CorsProvider, customProxyUrl: string = ''): string {
    if (provider === 'none') return proxiedUrl;
    
    let target = proxiedUrl;
    try {
        switch (provider) {
            case 'allorigins':
                target = new URL(proxiedUrl).searchParams.get('url') || proxiedUrl;
                break;
            case 'codetabs':
                target = new URL(proxiedUrl).searchParams.get('quest') || proxiedUrl;
                break;
            case 'thingproxy':
                target = proxiedUrl.replace('https://thingproxy.freeboard.io/fetch/', '');
                break;
            case 'corsanywhere':
                target = proxiedUrl.replace('https://cors-anywhere.herokuapp.com/', '');
                break;
            case 'corsproxy':
                target = proxiedUrl.replace('https://corsproxy.io/?', '');
                break;
            case 'custom':
                if (customProxyUrl) {
                    target = proxiedUrl.replace(customProxyUrl, '');
                }
                break;
        }
        
        // Some proxies might double-encode or just return the encoded string
        return decodeURIComponent(target);
    } catch {
        return target;
    }
}