interface RDAPEntity {
  roles: string[];
  publicIds?: { type: string; identifier: string }[];
  vcardArray: unknown[];
}

interface RDAPEvent {
  eventAction: string;
  eventDate: string;
}

export interface NormalizedRdapResponse {
  handle?: string;
  ldhName?: string;
  objectClassName?: string;
  status?: string[];
  nameservers?: { ldhName: string }[];
  events?: RDAPEvent[];
  entities?: RDAPEntity[];
  raw?: unknown;
  source: string;
  queryTimeMs: number;
}

export async function queryRdap(query: string): Promise<NormalizedRdapResponse> {
  const startTime = performance.now();
  const clean = query.trim();
  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(clean) || (clean.includes(':') && !clean.includes('.'));
  const basePath = isIP ? `ip/${clean}` : `domain/${clean}`;
  const mainUrl = `https://rdap.org/${basePath}`;

  const fetchWithTimeout = async (url: string, timeoutMs: number = 4000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/rdap+json, application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.json();
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  // 1. Try rdap.org
  try {
    const data = await fetchWithTimeout(mainUrl);
    return {
      handle: (data as { handle?: string }).handle,
      ldhName: (data as { ldhName?: string }).ldhName || clean,
      objectClassName: (data as { objectClassName?: string }).objectClassName || (isIP ? 'ip network' : 'domain'),
      status: (data as { status?: string[] }).status,
      nameservers: (data as { nameservers?: { ldhName: string }[] }).nameservers,
      events: (data as { events?: RDAPEvent[] }).events,
      entities: (data as { entities?: RDAPEntity[] }).entities,
      raw: data,
      source: 'rdap.org',
      queryTimeMs: Math.round(performance.now() - startTime)
    };
  } catch {
    // 2. Direct RIR fallback for IP addresses
    if (isIP) {
      // 2a. Direct ARIN REST API
      try {
        const arinData = await fetchWithTimeout(`https://whois.arin.net/rest/ip/${clean}.json`, 3000) as {
          net?: {
            handle?: { '$'?: string };
            name?: { '$'?: string };
            orgRef?: { '@name'?: string; '@handle'?: string };
            registrationDate?: { '$'?: string };
            updateDate?: { '$'?: string };
          };
        };
        if (arinData.net) {
          const events: RDAPEvent[] = [];
          if (arinData.net.registrationDate?.['$']) events.push({ eventAction: 'registration', eventDate: arinData.net.registrationDate['$'] });
          if (arinData.net.updateDate?.['$']) events.push({ eventAction: 'last changed', eventDate: arinData.net.updateDate['$'] });

          return {
            handle: arinData.net.handle?.['$'] || arinData.net.name?.['$'] || clean,
            ldhName: arinData.net.orgRef?.['@name'] || clean,
            objectClassName: 'ip network',
            events,
            raw: arinData,
            source: 'whois.arin.net (REST)',
            queryTimeMs: Math.round(performance.now() - startTime)
          };
        }
      } catch {
        // continue
      }

      // 2b. Direct RIR RDAP Endpoints
      const rirEndpoints = [
        `https://rdap.arin.net/registry/ip/${clean}`,
        `https://rdap.db.ripe.net/ip/${clean}`,
        `https://rdap.apnic.net/ip/${clean}`,
        `https://rdap.lacnic.net/rdap/ip/${clean}`,
        `https://rdap.afrinic.net/rdap/ip/${clean}`
      ];
      for (const endpoint of rirEndpoints) {
        try {
          const data = await fetchWithTimeout(endpoint, 3000);
          return {
            handle: (data as { handle?: string }).handle,
            ldhName: (data as { ldhName?: string }).ldhName || clean,
            objectClassName: 'ip network',
            status: (data as { status?: string[] }).status,
            events: (data as { events?: RDAPEvent[] }).events,
            entities: (data as { entities?: RDAPEntity[] }).entities,
            raw: data,
            source: endpoint,
            queryTimeMs: Math.round(performance.now() - startTime)
          };
        } catch {
          // Continue to next RIR
        }
      }
    } else {
      // 3. Fallback for domains: who-dat WHOIS parser
      try {
        const whoDatUrl = `https://who-dat.as93.net/${encodeURIComponent(clean.toLowerCase())}`;
        const whoDatData = await fetchWithTimeout(whoDatUrl, 3500) as {
          domain?: string;
          id?: string;
          status?: string[];
          nameservers?: { name: string }[];
          dates?: { created?: string; updated?: string; expires?: string };
          registrar?: { name?: string; abuseEmail?: string; abusePhone?: string; ianaId?: string | number };
        };

        if (whoDatData) {
          const events: RDAPEvent[] = [];
          if (whoDatData.dates?.created) events.push({ eventAction: 'registration', eventDate: whoDatData.dates.created });
          if (whoDatData.dates?.updated) events.push({ eventAction: 'last changed', eventDate: whoDatData.dates.updated });
          if (whoDatData.dates?.expires) events.push({ eventAction: 'expiration', eventDate: whoDatData.dates.expires });

          return {
            handle: whoDatData.id || '',
            ldhName: whoDatData.domain || clean,
            objectClassName: 'domain',
            status: whoDatData.status || [],
            nameservers: (whoDatData.nameservers || []).map(ns => ({ ldhName: ns.name })),
            events,
            raw: whoDatData,
            source: 'who-dat',
            queryTimeMs: Math.round(performance.now() - startTime)
          };
        }
      } catch {
        // Fallback failed
      }
    }
  }

  throw new Error(`Failed to resolve RDAP/WHOIS information for ${clean}`);
}
