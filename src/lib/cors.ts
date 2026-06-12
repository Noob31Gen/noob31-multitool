export type CorsProvider = 'auto' | 'none' | 'allorigins' | 'codetabs' | 'thingproxy' | 'corsanywhere' | 'corsproxy' | 'custom';
export function getProxiedUrl(targetUrl: string, provider: CorsProvider, customProxyUrl: string = ''): string {
    if (provider === 'none' || provider === 'auto') return targetUrl;
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

            if (!options.credentials) {
                finalOptions.credentials = 'include';
            }

            u.username = "";
            u.password = "";
            finalUrl = u.toString();
        }
    } catch { /* ignore */ }

    finalOptions.headers = headers;
    if (!finalOptions.credentials) {
        finalOptions.credentials = 'same-origin';
    }

    return fetch(finalUrl, finalOptions);
}

export function extractTargetUrl(proxiedUrl: string, provider: CorsProvider, customProxyUrl: string = ''): string {
    if (provider === 'none' || provider === 'auto') return proxiedUrl;

    let target = proxiedUrl;
    try {
        const urlObj = new URL(proxiedUrl);

        switch (provider) {
            case 'allorigins':
                target = urlObj.searchParams.get('url') || proxiedUrl;
                break;
            case 'codetabs':
                target = urlObj.searchParams.get('quest') || proxiedUrl;
                break;
            case 'corsproxy':
                if (proxiedUrl.includes('corsproxy.io/')) {
                    const parts = proxiedUrl.split('corsproxy.io/');
                    const potential = parts[parts.length - 1];
                    target = potential.startsWith('?') ? potential.substring(1) : potential;
                }
                break;
            case 'thingproxy':
                target = proxiedUrl.replace('https://thingproxy.freeboard.io/fetch/', '');
                break;
            case 'corsanywhere':
                target = proxiedUrl.replace('https://cors-anywhere.herokuapp.com/', '');
                break;
            case 'custom':
                if (customProxyUrl) {
                    if (proxiedUrl.includes(customProxyUrl)) {
                        target = proxiedUrl.split(customProxyUrl).pop() || target;
                    } else {
                        target = proxiedUrl.replace(customProxyUrl, '');
                    }
                }
                break;
        }

        let decoded = target;
        try {
            decoded = decodeURIComponent(target);
        } catch { /* ignore */ }

        return (decoded.startsWith('http://') || decoded.startsWith('https://')) ? decoded : target;
    } catch {
        return target;
    }
}

// Patch window.fetch to support Auto Fallback for CORS proxies
if (typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        let settings: { corsProvider?: CorsProvider; customCorsUrl?: string } | null = null;
        try {
            const saved = localStorage.getItem('url-scanner-settings');
            if (saved) {
                settings = JSON.parse(saved);
            }
        } catch { /* ignore */ }

        const corsProvider = settings?.corsProvider || 'auto';

        let urlStr = '';
        if (typeof input === 'string') {
            urlStr = input;
        } else if (input instanceof URL) {
            urlStr = input.toString();
        } else if (input && typeof (input as Request).url === 'string') {
            urlStr = (input as Request).url;
        }

        const isExternal = urlStr.startsWith('http://') || urlStr.startsWith('https://');
        const isLocalhost = urlStr.includes('localhost') || urlStr.includes('127.0.0.1') || urlStr.includes('::1');

        // Direct interception for explicitly chosen AllOrigins JSON-wrapped proxy
        const isAllOriginsJson = urlStr.startsWith('https://api.allorigins.win/get?url=');
        if (isAllOriginsJson) {
            const res = await originalFetch(input, init);
            if (res.ok) {
                const data = await res.json();
                return new Response(data.contents, {
                    status: res.status,
                    statusText: res.statusText,
                    headers: res.headers
                });
            }
            return res;
        }

        if (corsProvider === 'auto' && isExternal && !isLocalhost) {
            const AUTO_PROXY_CYCLE: CorsProvider[] = [
                'none',
                'corsproxy',
                'allorigins',
                'thingproxy',
                'corsanywhere',
                'codetabs'
            ];

            let lastError: unknown = null;

            for (const provider of AUTO_PROXY_CYCLE) {
                try {
                    const customCorsUrl = settings?.customCorsUrl || '';
                    const proxiedUrl = getProxiedUrl(urlStr, provider, customCorsUrl);

                    let requestToFetch: RequestInfo | URL = proxiedUrl;
                    if (typeof Request !== 'undefined' && input instanceof Request) {
                        requestToFetch = new Request(proxiedUrl, input);
                    }

                    const res = await originalFetch(requestToFetch, init);

                    if (res.ok) {
                        const contentType = res.headers.get('content-type') || '';
                        if (contentType.includes('text/html') && !urlStr.includes('crt.sh/?q=') && !urlStr.includes('web.archive.org')) {
                            const text = await res.clone().text();
                            if (
                                text.includes('Too Many Requests') ||
                                text.includes('Rate Limit') ||
                                text.includes('Block') ||
                                text.includes('Cloudflare')
                            ) {
                                throw new Error(`Proxy '${provider}' rate-limited or blocked.`);
                            }
                        }
                        return res;
                    }
                    throw new Error(`HTTP ${res.status}`);
                } catch (err) {
                    lastError = err;
                }
            }
            throw lastError || new Error('Auto CORS proxy fallback failed for all providers.');
        }

        return originalFetch(input, init);
    };
}