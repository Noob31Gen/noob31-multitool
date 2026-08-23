// Client-side TypeScript bridge for Noob31's MultiTools Helper Extension
// Handles postMessage communication, salted SHA-256 password hashing, and fetch proxies

import { logger } from './logger';

const DOMAIN_SALT = 'tools.noob31.com:salt:v1:';

export interface ExtensionStatus {
  isAvailable: boolean;
  version?: string;
  authenticated?: boolean;
  authRequired?: boolean;
  allowAllTargets?: boolean;
  domainWhitelistCount?: number;
  lastChecked?: number;
}

export interface ExtensionFetchResponse {
  success: boolean;
  ok?: boolean;
  status?: number;
  statusText?: string;
  contentType?: string;
  headers?: Record<string, string>;
  data?: unknown;
  error?: string;
  message?: string;
}

let cachedStatus: ExtensionStatus = {
  isAvailable: false
};

const listeners = new Set<(status: ExtensionStatus) => void>();
const pendingRequests = new Map<string, {
  resolve: (res: ExtensionFetchResponse) => void;
  reject: (err: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}>();

export async function computeExtensionAuthHash(password: string): Promise<string> {
  if (!password) return '';
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return password;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(DOMAIN_SALT + password);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function subscribeExtensionStatus(listener: (status: ExtensionStatus) => void): () => void {
  listeners.add(listener);
  listener(cachedStatus);
  return () => {
    listeners.delete(listener);
  };
}

function updateStatus(newStatus: Partial<ExtensionStatus>) {
  cachedStatus = { ...cachedStatus, ...newStatus, lastChecked: Date.now() };
  listeners.forEach(cb => cb(cachedStatus));
}

export function getExtensionStatus(): ExtensionStatus {
  return cachedStatus;
}

export function isExtensionAvailable(): boolean {
  return cachedStatus.isAvailable;
}

// Window Message Listener for Extension Communication
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.source === 'MULTITOOLS_EXTENSION') {
      const { type, requestId, response, version } = event.data;

      if (type === 'MULTITOOLS_ANNOUNCE') {
        updateStatus({ isAvailable: true, version: version || '1.0.0' });
      } else if (type === 'MULTITOOLS_PONG') {
        if (response && response.pong) {
          updateStatus({
            isAvailable: true,
            version: response.version || version || '1.0.0',
            authenticated: response.authenticated,
            authRequired: response.authRequired,
            allowAllTargets: response.allowAllTargets,
            domainWhitelistCount: response.domainWhitelistCount
          });
        } else if (response && response.error === 'AUTH_FAILED') {
          updateStatus({
            isAvailable: true,
            version: version || '1.0.0',
            authenticated: false,
            authRequired: true
          });
        }
      } else if (type === 'MULTITOOLS_FETCH_RESPONSE' && requestId) {
        const pending = pendingRequests.get(requestId);
        if (pending) {
          clearTimeout(pending.timeoutId);
          pendingRequests.delete(requestId);
          pending.resolve(response as ExtensionFetchResponse);
        }
      }
    }
  });

  // Initial announcement check
  setTimeout(() => {
    pingExtension();
  }, 100);
}

export async function pingExtension(password?: string): Promise<ExtensionStatus> {
  if (typeof window === 'undefined') {
    return { isAvailable: false };
  }

  const authHash = password ? await computeExtensionAuthHash(password) : undefined;

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      // Timeout without response
      if (!cachedStatus.isAvailable) {
        updateStatus({ isAvailable: false });
      }
      resolve(cachedStatus);
    }, 1500);

    const onPong = (event: MessageEvent) => {
      if (event.source === window && event.data?.source === 'MULTITOOLS_EXTENSION' && event.data?.type === 'MULTITOOLS_PONG') {
        clearTimeout(timeoutId);
        window.removeEventListener('message', onPong);
        const res = event.data.response;
        const status: ExtensionStatus = {
          isAvailable: true,
          version: res?.version || event.data.version || '1.0.0',
          authenticated: res?.authenticated ?? true,
          authRequired: res?.authRequired ?? false,
          allowAllTargets: res?.allowAllTargets,
          domainWhitelistCount: res?.domainWhitelistCount
        };
        updateStatus(status);
        resolve(status);
      }
    };

    window.addEventListener('message', onPong);
    window.postMessage({
      source: 'MULTITOOLS_PAGE',
      type: 'MULTITOOLS_PING',
      authHash
    }, '*');
  });
}

export async function extensionFetch(
  url: string,
  options: RequestInit = {},
  password?: string,
  timeoutMs: number = 15000
): Promise<Response> {
  if (typeof window === 'undefined') {
    throw new Error('extensionFetch can only be executed in a browser environment.');
  }

  const authHash = password ? await computeExtensionAuthHash(password) : undefined;
  const requestId = 'req_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();

  // Clean serializable options
  const serializedHeaders: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => {
        serializedHeaders[k] = v;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([k, v]) => {
        serializedHeaders[k] = v;
      });
    } else {
      Object.assign(serializedHeaders, options.headers);
    }
  }

  const serializableOptions = {
    method: options.method || 'GET',
    headers: serializedHeaders,
    body: typeof options.body === 'string' ? options.body : undefined
  };

  return new Promise<Response>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`Extension request to ${url} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    pendingRequests.set(requestId, {
      resolve: (extRes) => {
        if (!extRes || extRes.success === false) {
          const errMsg = extRes?.message || extRes?.error || 'Extension fetch error';
          logger.warn(`[ExtensionBridge] Fetch failed: ${errMsg}`);
          reject(new Error(errMsg));
          return;
        }

        // Construct standard Response object from extension response
        const headers = new Headers(extRes.headers || {});
        if (extRes.contentType && !headers.has('content-type')) {
          headers.set('content-type', extRes.contentType);
        }

        const bodyData = typeof extRes.data === 'object' ? JSON.stringify(extRes.data) : String(extRes.data ?? '');
        const responseInit: ResponseInit = {
          status: extRes.status || 200,
          statusText: extRes.statusText || 'OK',
          headers
        };

        const resObj = new Response(bodyData, responseInit);
        resolve(resObj);
      },
      reject,
      timeoutId
    });

    window.postMessage({
      source: 'MULTITOOLS_PAGE',
      type: 'MULTITOOLS_FETCH',
      requestId,
      url,
      options: serializableOptions,
      authHash
    }, '*');
  });
}
