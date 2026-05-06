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
    if (provider === 'none') return proxiedUrl;

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