export interface ParsedRDAP {
  name: string;
  handle: string;
  type: string;
  registrar?: string;
  registrarIanaId?: string;
  registrant?: string;
  abuseContact?: string;
  abusePhone?: string;
  abuseAddress?: string;
  adminContact?: string;
  techContact?: string;
  nocContact?: string;
  address?: string;
  creationDate?: string;
  expirationDate?: string;
  updatedDate?: string;
  nameservers: string[];
  statuses: string[];
  ipRange?: string;
  country?: string;
  rir?: string;
}

interface RDAPData {
  ldhName?: string;
  name?: string;
  handle?: string;
  objectClassName?: string;
  status?: string[];
  startAddress?: string;
  endAddress?: string;
  country?: string;
  port43?: string;
  nameservers?: { ldhName: string }[];
  events?: { eventAction: string; eventDate: string }[];
  entities?: RDAPData[];
  roles?: string[];
  vcardArray?: unknown[];
  publicIds?: { type: string; identifier: string }[];
  notices?: { title?: string; description?: string[] }[];
}

function processEntities(entities: RDAPData[], parsed: ParsedRDAP) {
  if (!entities || !Array.isArray(entities)) return;
  for (const entity of entities) {
    const roles = (entity.roles || []).map(r => r.toLowerCase());
    const vcard = (entity.vcardArray?.[1] as [string, Record<string, unknown>, string, string | string[]][]) || [];
    let fn = '';
    let email = '';
    let tel = '';
    let org = '';
    let adr = '';

    for (const item of vcard) {
      if (item[0] === 'fn' && typeof item[3] === 'string') fn = item[3];
      if (item[0] === 'email' && typeof item[3] === 'string') email = item[3];
      if (item[0] === 'tel' && typeof item[3] === 'string') tel = item[3];
      if (item[0] === 'org' && typeof item[3] === 'string') org = item[3];
      if (item[0] === 'adr' && Array.isArray(item[3])) {
        adr = item[3].filter(Boolean).join(', ');
      }
    }

    const nameToUse = org || fn;
    const fullContact = email ? `${nameToUse ? `${nameToUse} - ` : ''}${email}` : (nameToUse || tel);

    if (adr && !parsed.address) {
      parsed.address = adr;
    }

    if (roles.includes('registrar')) {
      if (!parsed.registrar && nameToUse) parsed.registrar = nameToUse;
      if (entity.publicIds && Array.isArray(entity.publicIds)) {
        const iana = entity.publicIds.find((id: { type: string; identifier: string }) =>
          id.type && id.type.toLowerCase().includes('iana')
        );
        if (iana) parsed.registrarIanaId = iana.identifier;
      }
    }
    if ((roles.includes('registrant') || roles.includes('owner')) && !parsed.registrant && nameToUse) {
      parsed.registrant = nameToUse;
    }
    if (roles.includes('abuse')) {
      if (!parsed.abuseContact && fullContact) parsed.abuseContact = fullContact;
      if (!parsed.abusePhone && tel) parsed.abusePhone = tel;
      if (!parsed.abuseAddress && adr) parsed.abuseAddress = adr;
    }
    if ((roles.includes('administrative') || roles.includes('admin')) && !parsed.adminContact && fullContact) {
      parsed.adminContact = fullContact;
    }
    if ((roles.includes('technical') || roles.includes('tech')) && !parsed.techContact && fullContact) {
      parsed.techContact = fullContact;
    }
    if (roles.includes('noc') && !parsed.nocContact && fullContact) {
      parsed.nocContact = fullContact;
    }

    if (entity.entities) {
      processEntities(entity.entities, parsed);
    }
  }
}

function toLocalTime(isoString?: string): string | undefined {
  if (!isoString) return undefined;
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString();
  } catch {
    return isoString;
  }
}

export function parseRDAP(data: RDAPData): ParsedRDAP {
  const parsed: ParsedRDAP = {
    name: data.ldhName || data.name || '',
    handle: data.handle || '',
    type: data.objectClassName || '',
    nameservers: [],
    statuses: data.status || [],
  };

  if (data.startAddress && data.endAddress) {
    parsed.ipRange = `${data.startAddress} - ${data.endAddress}`;
  }
  if (data.country) {
    parsed.country = data.country;
  }
  if (data.port43) {
    const p43 = data.port43.toLowerCase();
    if (p43.includes('arin')) parsed.rir = 'ARIN';
    else if (p43.includes('ripe')) parsed.rir = 'RIPE NCC';
    else if (p43.includes('apnic')) parsed.rir = 'APNIC';
    else if (p43.includes('lacnic')) parsed.rir = 'LACNIC';
    else if (p43.includes('afrinic')) parsed.rir = 'AFRINIC';
  }

  if (data.nameservers && Array.isArray(data.nameservers)) {
    parsed.nameservers = data.nameservers.map((ns: { ldhName: string }) => ns.ldhName).filter(Boolean);
  }

  if (data.events && Array.isArray(data.events)) {
    for (const event of data.events) {
      const action = (event.eventAction || '').toLowerCase().replace(/[-_]/g, ' ');
      if (action === 'registration' || action === 'registered' || action === 'allocated' || action === 'assigned') {
        if (!parsed.creationDate) parsed.creationDate = toLocalTime(event.eventDate);
      }
      if (action === 'expiration' || action === 'expiry' || action === 'expire') {
        if (!parsed.expirationDate) parsed.expirationDate = toLocalTime(event.eventDate);
      }
      if (action === 'last changed' || action === 'last changed' || action === 'updated' || action === 'last modified') {
        if (!parsed.updatedDate) parsed.updatedDate = toLocalTime(event.eventDate);
      }
    }
  }

  if (data.entities) {
    processEntities(data.entities, parsed);
  }

  return parsed;
}