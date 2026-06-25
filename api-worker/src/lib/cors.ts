export type CorsProvider = 'auto' | 'none' | 'corsproxy' | 'custom';
export function getProxiedUrl(targetUrl: string, provider: CorsProvider, customProxyUrl: string = ''): string {
    if (provider === 'none' || provider === 'auto') return targetUrl;
    let proxyBase = '';
    switch (provider) {
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
        new URL(proxiedUrl);

        switch (provider) {
            case 'corsproxy':
                if (proxiedUrl.includes('corsproxy.io/')) {
                    const parts = proxiedUrl.split('corsproxy.io/');
                    const potential = parts[parts.length - 1];
                    target = potential.startsWith('?') ? potential.substring(1) : potential;
                }
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

        if (corsProvider === 'auto' && isExternal && !isLocalhost) {
            const AUTO_PROXY_CYCLE: CorsProvider[] = [
                'none',
                'corsproxy'
            ];

            let lastError: unknown = null;

            for (const provider of AUTO_PROXY_CYCLE) {
                const attemptController = new AbortController();
                const onAbort = () => attemptController.abort();

                if (init?.signal) {
                    if (init.signal.aborted) {
                        throw new Error('Signal aborted');
                    }
                    init.signal.addEventListener('abort', onAbort);
                }

                // 3000ms timeout per proxy attempt
                const attemptTimeoutId = setTimeout(() => attemptController.abort(), 3000);

                try {
                    const customCorsUrl = settings?.customCorsUrl || '';
                    const proxiedUrl = getProxiedUrl(urlStr, provider, customCorsUrl);

                    let requestToFetch: RequestInfo | URL = proxiedUrl;
                    if (typeof Request !== 'undefined' && input instanceof Request) {
                        requestToFetch = new Request(proxiedUrl, input);
                    }

                    const attemptInit: RequestInit = {
                        ...(init || {}),
                        signal: attemptController.signal
                    };

                    const res = await originalFetch(requestToFetch, attemptInit);
                    clearTimeout(attemptTimeoutId);
                    if (init?.signal) {
                        init.signal.removeEventListener('abort', onAbort);
                    }

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
                    clearTimeout(attemptTimeoutId);
                    if (init?.signal) {
                        init.signal.removeEventListener('abort', onAbort);
                    }
                    lastError = err;
                }
            }
            throw lastError || new Error('Auto CORS proxy fallback failed for all providers.');
        }

        return originalFetch(input, init);
    };
}