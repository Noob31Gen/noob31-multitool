import type { AppSettings } from "./settings"
import { getProxiedUrl, authenticatedFetch } from "./cors"
import { safeStorage } from "./storage"
import { logger } from "./logger"
import { isCustomServerEnabled, queryRdapServer } from "./apiServer"

export async function queryRDAP(query: string, settings: AppSettings) {
  query = query.trim();

  // If custom API server resolution is active, route through backend worker
  if (isCustomServerEnabled(settings)) {
    return queryRdapServer(query, settings);
  }

  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(query) || (query.includes(':') && !query.includes('.'));
  const basePath = isIP ? `ip/${query}` : `domain/${query}`;
  const url = `https://rdap.org/${basePath}`;
  
  // 1. Consult safeStorage cache first (1-hour cache TTL)
  const cacheKey = `rdap_${query.toLowerCase()}`;
  try {
    const cached = safeStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 3600000) { 
        return parsed.data;
      }
    }
  } catch { /* ignore safeStorage issues */ }

  const fetchWithProxy = async (targetUrl: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(targetUrl, { signal: controller.signal, headers: { 'Accept': 'application/rdap+json' } });
      clearTimeout(timeoutId);
      if (res.ok) return await res.json();
      throw new Error(`HTTP error ${res.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  const fetchWithProxyAndAuth = async (targetUrl: string) => {
    const proxyUrl = getProxiedUrl(targetUrl, settings.corsProvider, settings.customCorsUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await authenticatedFetch(proxyUrl, { signal: controller.signal, headers: { 'Accept': 'application/rdap+json' } });
      clearTimeout(timeoutId);
      if (res.ok) return await res.json();
      throw new Error(`HTTP error via proxy ${res.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  const tryQuery = async (targetUrl: string) => {
    try {
      return await fetchWithProxy(targetUrl);
    } catch {
      if (settings.corsProvider !== 'none') {
        return await fetchWithProxyAndAuth(targetUrl);
      }
      throw new Error(`Failed to fetch ${targetUrl}`);
    }
  };

  try {
    const data = await tryQuery(url);
    try {
      safeStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
    } catch { /* ignore */ }
    return data;
  } catch (err: unknown) {
    // Fallback: If rdap.org fails and it's an IP address, query regional registries directly
    if (isIP) {
      const rirEndpoints = [
        `https://rdap.arin.net/registry/ip/${query}`,
        `https://rdap.db.ripe.net/ip/${query}`,
        `https://rdap.apnic.net/ip/${query}`,
        `https://rdap.lacnic.net/rdap/ip/${query}`,
        `https://rdap.afrinic.net/rdap/ip/${query}`
      ];
      for (const endpoint of rirEndpoints) {
        try {
          const data = await tryQuery(endpoint);
          try {
            safeStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
          } catch { /* ignore */ }
          return data;
        } catch { /* ignore and try next */ }
      }
    } else {
      // Fallback for domains: query who-dat API
      try {
        const whoDatUrl = `https://who-dat.as93.net/${query.toLowerCase()}`;
        const whoDatRes = await tryQuery(whoDatUrl);
        if (whoDatRes && whoDatRes.isRegistered !== false) {
          const mappedData = mapWhoDatToRDAP(whoDatRes);
          try {
            safeStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: mappedData }));
          } catch { /* ignore */ }
          return mappedData;
        }
      } catch (whoDatErr) {
        logger.warn("who-dat WHOIS fallback failed:", whoDatErr);
      }
    }
    throw err;
  }
}

interface WhoDatContact {
  name?: string;
  organization?: string;
  email?: string;
}

interface WhoDatResponse {
  registrar?: {
    name?: string;
    abuseEmail?: string;
    abusePhone?: string;
    ianaId?: string | number;
  };
  contacts?: {
    registrant?: WhoDatContact;
    admin?: WhoDatContact;
    tech?: WhoDatContact;
  };
  dates?: {
    created?: string;
    updated?: string;
    expires?: string;
  };
  domain?: string;
  query?: string;
  id?: string;
  status?: string[];
  nameservers?: { name: string }[];
}

type VCardProperty = [string, Record<string, unknown>, string, string];
type VCard = ["vcard", VCardProperty[]];

interface RDAPEntity {
  roles: string[];
  publicIds?: { type: string; identifier: string }[];
  vcardArray: VCard;
}

interface RDAPEvent {
  eventAction: string;
  eventDate: string;
}

function mapWhoDatToRDAP(w: WhoDatResponse) {
  const entities: RDAPEntity[] = [];
  
  if (w.registrar) {
    const vcardProperties: VCardProperty[] = [
      ["fn", {}, "text", w.registrar.name || ""],
      ["email", {}, "text", w.registrar.abuseEmail || ""],
      ["tel", {}, "text", w.registrar.abusePhone || ""]
    ].filter((item): item is VCardProperty => !!item[3]);

    const vcard: VCard = ["vcard", vcardProperties];
    
    entities.push({
      roles: ["registrar"],
      publicIds: w.registrar.ianaId ? [
        { type: "IANA Registrar ID", identifier: String(w.registrar.ianaId) }
      ] : [],
      vcardArray: vcard
    });
  }

  const contactRoles = ['registrant', 'admin', 'tech'] as const;
  for (const role of contactRoles) {
    const contact = w.contacts?.[role];
    if (contact && (contact.name || contact.organization || contact.email)) {
      const fn = contact.organization || contact.name || "";
      const vcardProperties: VCardProperty[] = [
        ["fn", {}, "text", fn],
        ["email", {}, "text", contact.email || ""]
      ].filter((item): item is VCardProperty => !!item[3]);

      const vcard: VCard = ["vcard", vcardProperties];
      entities.push({
        roles: [role],
        vcardArray: vcard
      });
    }
  }

  const events: RDAPEvent[] = [];
  if (w.dates?.created) events.push({ eventAction: 'registration', eventDate: w.dates.created });
  if (w.dates?.updated) events.push({ eventAction: 'last changed', eventDate: w.dates.updated });
  if (w.dates?.expires) events.push({ eventAction: 'expiration', eventDate: w.dates.expires });

  return {
    ldhName: w.domain || w.query || "",
    handle: w.id || "",
    objectClassName: "domain",
    status: w.status || [],
    nameservers: Array.isArray(w.nameservers) ? w.nameservers.map((ns) => ({ ldhName: ns.name })) : [],
    events,
    entities
  };
}