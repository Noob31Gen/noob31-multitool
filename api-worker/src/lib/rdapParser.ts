export interface ParsedRDAP {
  name: string;
  handle: string;
  type: string;
  registrar?: string;
  registrarIanaId?: string;
  registrant?: string;
  abuseContact?: string;
  adminContact?: string;
  techContact?: string;
  creationDate?: string;
  expirationDate?: string;
  updatedDate?: string;
  nameservers: string[];
  statuses: string[];
  ipRange?: string;
  country?: string;
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
  nameservers?: { ldhName: string }[];
  events?: { eventAction: string; eventDate: string }[];
  entities?: RDAPData[];
  roles?: string[];
  vcardArray?: unknown[];
  publicIds?: { type: string; identifier: string }[];
}

function processEntities(entities: RDAPData[], parsed: ParsedRDAP) {
  if (!entities || !Array.isArray(entities)) return;
  for (const entity of entities) {
    const roles = entity.roles || [];
    const vcard = (entity.vcardArray?.[1] as [string, Record<string, unknown>, string, string][]) || [];
    let fn = '';
    let email = '';
    let org = '';
    for (const item of vcard) {
      if (item[0] === 'fn') fn = item[3];
      if (item[0] === 'email') email = item[3];
      if (item[0] === 'org') org = item[3];
    }
    const nameToUse = org || fn;
    const fullContact = email ? `${nameToUse} - ${email}` : nameToUse;
    if (roles.includes('registrar')) {
      if (!parsed.registrar) parsed.registrar = nameToUse;
      if (entity.publicIds && Array.isArray(entity.publicIds)) {
        const iana = entity.publicIds.find((id: { type: string; identifier: string }) =>
          id.type && id.type.toLowerCase() === 'iana registrar id'
        );
        if (iana) parsed.registrarIanaId = iana.identifier;
      }
    }
    if (roles.includes('registrant') && !parsed.registrant) {
      parsed.registrant = nameToUse;
    }
    if (roles.includes('abuse') && !parsed.abuseContact && fullContact) {
      parsed.abuseContact = fullContact;
    }
    if (roles.includes('administrative') && !parsed.adminContact && fullContact) {
      parsed.adminContact = fullContact;
    }
    if (roles.includes('technical') && !parsed.techContact && fullContact) {
      parsed.techContact = fullContact;
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
  if (data.nameservers && Array.isArray(data.nameservers)) {
    parsed.nameservers = data.nameservers.map((ns: { ldhName: string }) => ns.ldhName).filter(Boolean);
  }
  if (data.events && Array.isArray(data.events)) {
    for (const event of data.events) {
      if (event.eventAction === 'registration') parsed.creationDate = toLocalTime(event.eventDate);
      if (event.eventAction === 'expiration') parsed.expirationDate = toLocalTime(event.eventDate);
      if (event.eventAction === 'last changed') parsed.updatedDate = toLocalTime(event.eventDate);
    }
  }
  if (data.entities) {
    processEntities(data.entities, parsed);
  }
  return parsed;
}