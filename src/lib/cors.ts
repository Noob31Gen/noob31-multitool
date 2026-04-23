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