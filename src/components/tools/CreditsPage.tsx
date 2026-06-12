import { Card } from "@/components/ui/card"
import { SEO } from "@/components/shared/SEO"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"

interface SourceItem {
  name: string;
  url: string;
  badge: "DNS Query" | "Direct API" | "Proxy Fallback" | "External Redirect" | "Data Fetch";
  why: string;
  how: string;
}

interface SourceCategory {
  title: string;
  description: string;
  sources: SourceItem[];
}

export function CreditsPage() {
  const categories: SourceCategory[] = [
    {
      title: "Subdomain Enumeration & Certificates",
      description: "Passive DNS records and Certificate Transparency logs queried to map subdomains and certificate histories.",
      sources: [
        {
          name: "HackerTarget",
          url: "https://api.hackertarget.com/",
          badge: "Direct API",
          why: "To quickly retrieve active subdomain mappings associated with a target domain.",
          how: "Queried via their keyless host-search HTTP endpoint with fallback proxy support."
        },
        {
          name: "urlscan.io",
          url: "https://urlscan.io/",
          badge: "Direct API",
          why: "To parse crawl histories and identify active subdomains.",
          how: "Searches their public website scan catalog using lightweight search queries."
        },
        {
          name: "crt.sh",
          url: "https://crt.sh/",
          badge: "Direct API",
          why: "To scan Certificate Transparency logs for SSL/TLS certificate domains.",
          how: "Queries their public PostgreSQL database output directly in JSON format."
        },
        {
          name: "CertSpotter",
          url: "https://api.certspotter.com/",
          badge: "Direct API",
          why: "To identify TLS/SSL certificate issuances for target subdomains.",
          how: "Queries SSLMate's keyless CertSpotter v1 API logs."
        },
        {
          name: "Anubis",
          url: "https://jldc.me/anubis/",
          badge: "Direct API",
          why: "To lookup historical subdomains in a passive repository.",
          how: "Queries the keyless subdomain enumeration API hosted by jldc.me."
        },
        {
          name: "Mnemonic",
          url: "https://api.mnemonic.no/",
          badge: "Direct API",
          why: "To fetch historical host-to-IP mappings.",
          how: "Queries Mnemonic's passive DNS v3 lookup service."
        },
        {
          name: "BufferOver",
          url: "https://tls.bufferover.run/",
          badge: "Direct API",
          why: "To harvest subdomains from large public FDNS datasets.",
          how: "Performs DNS lookup queries against their keyless TLS endpoint."
        },
        {
          name: "Wayback Machine",
          url: "http://web.archive.org/",
          badge: "Direct API",
          why: "To discover subdomains indexed in historical snapshots.",
          how: "Scans the Internet Archive CDX server database using wildcard domain paths."
        },
        {
          name: "AlienVault OTX (Passive DNS)",
          url: "https://otx.alienvault.com/",
          badge: "Direct API",
          why: "To retrieve passive DNS resolution records from community sensors.",
          how: "Fetches subdomain history via the Open Threat Exchange indicator endpoint."
        },
        {
          name: "ThreatMiner (Subdomains)",
          url: "https://www.threatminer.org/",
          badge: "Direct API",
          why: "To extract subdomain associations from intelligence files.",
          how: "Performs passive indicators query (rt=5) against the ThreatMiner database."
        },
        {
          name: "Subdomain Center",
          url: "https://subdomain.center/",
          badge: "Direct API",
          why: "To fetch consolidated subdomains from a keyless indexer.",
          how: "Requests subdomain list directly using their keyless public search API."
        },
        {
          name: "Censys Certificates",
          url: "https://censys.io/",
          badge: "External Redirect",
          why: "To direct users to Censys' comprehensive certificate transparency interface.",
          how: "Opens a structured query parameter link (search?q={domain}) in a new tab."
        }
      ]
    },
    {
      title: "DNS Resolvers (DNS-over-HTTPS)",
      description: "Secure DoH endpoints used to query general DNS records and verify threat sinkholes.",
      sources: [
        {
          name: "Google Public DNS",
          url: "https://dns.google/",
          badge: "DNS Query",
          why: "To resolve A, AAAA, MX, TXT, NS, SOA, and CNAME records.",
          how: "Queries their JSON-over-HTTPS resolution endpoint."
        },
        {
          name: "Cloudflare DNS",
          url: "https://cloudflare-dns.com/",
          badge: "DNS Query",
          why: "To query DNSSEC parameters and resolve domains rapidly.",
          how: "Sends authenticated DNS-JSON request headers via HTTP."
        },
        {
          name: "AliDNS",
          url: "https://dns.alidns.com/",
          badge: "DNS Query",
          why: "To check global DNS availability using geodiverse servers.",
          how: "Performs standard DoH lookup queries against Alibaba's DNS resolver."
        },
        {
          name: "AdGuard DNS",
          url: "https://dns.adguard-dns.com/",
          badge: "DNS Query",
          why: "To resolve records with standard validation.",
          how: "Encodes binary DNS messages and transmits them via base64Url requests."
        },
        {
          name: "Quad9 DNS",
          url: "https://www.quad9.net/",
          badge: "DNS Query",
          why: "To check security blocks by checking if the domain is sinkholed.",
          how: "Compares standard query results against Quad9's threat-blocking resolver response."
        },
        {
          name: "OpenDNS",
          url: "https://www.opendns.com/",
          badge: "DNS Query",
          why: "To resolve records as an auto-fallback provider.",
          how: "Sends base64-encoded DNS packet queries over HTTPS."
        },
        {
          name: "IANA (TLD Database)",
          url: "https://data.iana.org/",
          badge: "Data Fetch",
          why: "To dynamically refresh the application's list of valid Top-Level Domains.",
          how: "Downloads the raw, official tlds-alpha-by-domain.txt list from IANA."
        }
      ]
    },
    {
      title: "WHOIS & RDAP Registrations",
      description: "APIs used to find creation dates, registrars, and contact data.",
      sources: [
        {
          name: "rdap.org",
          url: "https://rdap.org/",
          badge: "Direct API",
          why: "To query registrar metadata and domain/IP age globally.",
          how: "Performs RDAP queries which auto-redirect to active registry databases."
        },
        {
          name: "RIR Registries (ARIN, RIPE, APNIC, LACNIC, AFRINIC)",
          url: "https://rdap.org/",
          badge: "Direct API",
          why: "To check IP block allocations directly when global redirectors fail.",
          how: "Directly queries regional registry RDAP endpoints depending on IP ranges."
        },
        {
          name: "who-dat (as93.net)",
          url: "https://who-dat.as93.net/",
          badge: "Direct API",
          why: "To retrieve registry details for ccTLDs lacking RDAP servers.",
          how: "Queries a keyless WHOIS-to-JSON parsing adapter."
        }
      ]
    },
    {
      title: "IP Geolocation & Routing (ASN)",
      description: "Data providers queried to parse autonomous systems, physical locations, and hosting categories.",
      sources: [
        {
          name: "ipapi.is",
          url: "https://ipapi.is/",
          badge: "Direct API",
          why: "To detect ISP, hosting type, Tor nodes, proxy, VPN, and abuser scores.",
          how: "Serves as the primary source for comprehensive IP metadata."
        },
        {
          name: "ipwhois.app",
          url: "https://ipwhois.app/",
          badge: "Direct API",
          why: "To retrieve location coordinates, country, and ISP.",
          how: "Queried as the primary fallback for IP address geolocation."
        },
        {
          name: "ip-api.com",
          url: "http://ip-api.com/",
          badge: "Proxy Fallback",
          why: "To fetch IP records through CORS proxies (since HTTP-only is keyless).",
          how: "Acts as a secondary proxy-friendly IP details lookup fallback."
        },
        {
          name: "ipapi.co",
          url: "https://ipapi.co/",
          badge: "Direct API",
          why: "To retrieve IP location details directly on the client side.",
          how: "Used as a direct HTTPS geolocation query fallback."
        },
        {
          name: "RIPE Stat",
          url: "https://stat.ripe.net/",
          badge: "Direct API",
          why: "To get the registered owner and block allocations of an ASN.",
          how: "Fetches AS overview details directly from the RIPE NCC data API."
        },
        {
          name: "PeeringDB",
          url: "https://www.peeringdb.com/",
          badge: "Direct API",
          why: "To look up exchange points, public peering facilities, and website URLs.",
          how: "Queries PeeringDB's public ASN networking catalog."
        },
        {
          name: "BGPView",
          url: "https://bgpview.io/",
          badge: "Direct API",
          why: "To extract autonomous system routes and IP address prefix blocks.",
          how: "Queries the BGPView public autonomous system API."
        }
      ]
    },
    {
      title: "Domain Blocklists & Reputation",
      description: "Databases queried via DNS or API to detect active malicious domains.",
      sources: [
        {
          name: "SURBL",
          url: "https://www.surbl.org/",
          badge: "DNS Query",
          why: "To check malicious URI lists embedded inside spam emails.",
          how: "Queries the SURBL multi-zone (multi.surbl.org) using custom return IP classifiers."
        },
        {
          name: "AlienVault OTX Threat Pulses",
          url: "https://otx.alienvault.com/",
          badge: "Direct API",
          why: "To check if domains match open-source community intelligence indicators.",
          how: "Fetches recent threat reports using OTX's general domain endpoint."
        },
        {
          name: "ThreatMiner (Malware)",
          url: "https://www.threatminer.org/",
          badge: "Direct API",
          why: "To count malware samples associated with a domain in threat reports.",
          how: "Performs malware analysis queries (rt=4) against the ThreatMiner catalog."
        },
        {
          name: "Google Safe Browsing",
          url: "https://safebrowsing.google.com/",
          badge: "External Redirect",
          why: "To enable quick manual checks of malicious site status in Google's database.",
          how: "Opens the Safe Browsing Transparency Report page in a new window."
        },
        {
          name: "VirusTotal",
          url: "https://www.virustotal.com/",
          badge: "External Redirect",
          why: "To allow manual investigation of multi-vendor security scans.",
          how: "Directs users to VirusTotal's official domain scanning report page."
        }
      ]
    },
    {
      title: "Threat Intelligence Aggregation",
      description: "Feeds and databases queried dynamically in the Threat Intelligence Explorer to trace Indicators of Compromise (IOCs).",
      sources: [
        {
          name: "PhishStats",
          url: "https://phishstats.info/",
          badge: "Direct API",
          why: "To search recent phishing logs for target indicators and track threat scores.",
          how: "Queries the PhishStats API for URLs matching domains, IPs, or keywords via proxy."
        },
        {
          name: "MalwareBazaar",
          url: "https://malwarebazaar.abuse.ch/",
          badge: "Direct API",
          why: "To inspect file hash definitions, signatures, and vendor detection rate averages.",
          how: "Sends POST requests to Abuse.ch MalwareBazaar's keyless file hash database."
        },
        {
          name: "ThreatMiner (Passive Intel)",
          url: "https://www.threatminer.org/",
          badge: "Direct API",
          why: "To extract historic host-to-IP passive DNS and malware hash connections.",
          how: "Queries ThreatMiner's unauthenticated hosts and domain endpoints."
        },
        {
          name: "urlscan.io (Scan Search)",
          url: "https://urlscan.io/",
          badge: "Direct API",
          why: "To list recent public crawler runs, screenshots, and security classifications.",
          how: "Queries urlscan.io search endpoint for matching scan IDs and assets."
        }
      ]
    },
    {
      title: "MAC Address Databases (OUI)",
      description: "Directories queried to parse network card manufacturers and OUI blocks.",
      sources: [
        {
          name: "MACVendorLookup.com",
          url: "https://www.macvendorlookup.com/",
          badge: "Direct API",
          why: "To resolve corporate address and registered range details of a MAC OUI.",
          how: "Sends MAC address lookups through their public API."
        },
        {
          name: "maclookup.app",
          url: "https://maclookup.app/",
          badge: "Direct API",
          why: "To identify manufacturer details and block classification types.",
          how: "Queries OUI codes against their v2 database."
        },
        {
          name: "MacVendors.com",
          url: "https://macvendors.com/",
          badge: "Direct API",
          why: "To return plain text manufacturer names.",
          how: "Queries their simple keyless OUI text responder."
        }
      ]
    },
    {
      title: "CORS Proxies",
      description: "Intermediate proxy engines used to bypass browser Cross-Origin Resource Sharing restrictions.",
      sources: [
        {
          name: "AllOrigins",
          url: "https://allorigins.win/",
          badge: "Proxy Fallback",
          why: "To fetch JSON payloads from domains without CORS headers.",
          how: "Wraps target requests in a proxy server callback."
        },
        {
          name: "CodeTabs",
          url: "https://codetabs.com/",
          badge: "Proxy Fallback",
          why: "To route XML or plaintext payloads bypass cross-origin restrictions.",
          how: "Acts as a fast, alternative intermediate proxy resolver."
        },
        {
          name: "ThingProxy",
          url: "https://github.com/Rob--W/cors-anywhere",
          badge: "Proxy Fallback",
          why: "To resolve headers and resource queries during fallback cascades.",
          how: "Proxies request headers to target API hosts."
        },
        {
          name: "Cors-Anywhere",
          url: "https://cors-anywhere.herokuapp.com/",
          badge: "Proxy Fallback",
          why: "To fetch headers during secondary fallback probes.",
          how: "Proxies standard HTTP HEAD/GET calls to avoid client blockades."
        },
        {
          name: "Corsproxy.io",
          url: "https://corsproxy.io/",
          badge: "Proxy Fallback",
          why: "To act as a primary proxy resolver for high-availability lookup queries.",
          how: "Injects CORS headers dynamically onto target HTTP queries."
        }
      ]
    }
  ];

  const getBadgeVariant = (type: SourceItem["badge"]) => {
    switch (type) {
      case "DNS Query": return "default";
      case "Direct API": return "secondary";
      case "Proxy Fallback": return "outline";
      case "External Redirect": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <SEO
        title="Credits & Data Sources"
        description="A list of APIs, services, and libraries that power Noob31's MultiTools. Special thanks to all the providers."
        url="https://tools.noob31.com/about/credits"
      />
      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">Credits & Data Sources</h1>
        <p className="text-muted-foreground mt-2">
          To maintain maximum privacy, performance, and accessibility, this application utilizes keyless queries, cascading CORS proxies, and secure DoH resolvers. Below is the full directory of all data sources used.
        </p>
      </div>

      <div className="space-y-8">
        {categories.map((category, idx) => (
          <div key={idx} className="space-y-4">
            <div className="border-b pb-2">
              <h2 className="text-lg font-bold tracking-tight">{category.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.sources.map((source, sIdx) => (
                <Card key={sIdx} className="p-4 bg-muted/30 border-border/60 flex flex-col justify-between hover:bg-muted/50 transition-colors">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sm hover:underline flex items-center gap-1 group text-primary"
                      >
                        {source.name}
                        <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <Badge variant={getBadgeVariant(source.badge)} className="text-[9px] px-1.5 py-0 font-mono font-bold uppercase shrink-0">
                        {source.badge}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <strong className="text-muted-foreground">Why: </strong>
                        <span className="text-foreground/90">{source.why}</span>
                      </div>
                      <div>
                        <strong className="text-muted-foreground">How: </strong>
                        <span className="text-foreground/90">{source.how}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}