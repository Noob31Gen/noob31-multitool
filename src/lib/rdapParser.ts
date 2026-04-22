export interface ParsedRDAP {
  name: string;
  handle: string;
  type: string; 
  registrar?: string;
  registrant?: string;
  creationDate?: string;
  expirationDate?: string;
  updatedDate?: string;
  nameservers: string[];
  statuses: string[];
  ipRange?: string;
  country?: string;
}

export function parseRDAP(data: any): ParsedRDAP {
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
    parsed.nameservers = data.nameservers.map((ns: any) => ns.ldhName).filter(Boolean);
  }

  if (data.events && Array.isArray(data.events)) {
    for (const event of data.events) {
      if (event.eventAction === 'registration') parsed.creationDate = event.eventDate;
      if (event.eventAction === 'expiration') parsed.expirationDate = event.eventDate;
      if (event.eventAction === 'last changed') parsed.updatedDate = event.eventDate;
    }
  }

  if (data.entities && Array.isArray(data.entities)) {
    for (const entity of data.entities) {
      const roles = entity.roles || [];
      const vcard = entity.vcardArray?.[1] || [];
      
      let fn = '';
      for (const item of vcard) {
        if (item[0] === 'fn') {
          fn = item[3];
          break;
        }
      }

      if (roles.includes('registrar') && !parsed.registrar) {
        parsed.registrar = fn;
      }
      if (roles.includes('registrant') && !parsed.registrant) {
        parsed.registrant = fn;
      }
    }
  }

  return parsed;
}
