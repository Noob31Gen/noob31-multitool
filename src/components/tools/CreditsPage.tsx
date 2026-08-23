import { Card } from "@/components/ui/card"
import { SEO } from "@/components/shared/SEO"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"

interface SourceItem {
  name: string;
  url: string;
  badge: "DNS Query" | "Direct API" | "Proxy Fallback" | "Data Fetch" | "Extension Helper";
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
          name: "crt.name",
          url: "https://crt.name/",
          badge: "Direct API",
          why: "To scan Certificate Transparency logs for full apex and subdomain issuances.",
          how: "Streams newline-delimited certificate domain records directly via their keyless search API."
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
          name: "RapidDNS",
          url: "https://rapiddns.io/",
          badge: "Direct API",
          why: "To discover public subdomains via fast DNS indexing.",
          how: "Extracts subdomain records from RapidDNS query tables."
        },
        {
          name: "Mnemonic",
          url: "https://api.mnemonic.no/",
          badge: "Direct API",
          why: "To fetch historical host-to-IP mappings.",
          how: "Queries Mnemonic's passive DNS v3 lookup service."
        },
        {
          name: "AlienVault OTX (Passive DNS)",
          url: "https://otx.alienvault.com/",
          badge: "Direct API",
          why: "To retrieve passive DNS resolution records from community sensors.",
          how: "Fetches subdomain history via the Open Threat Exchange indicator endpoint."
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
          name: "FreeIPAPI",
          url: "https://freeipapi.com/",
          badge: "Direct API",
          why: "To provide keyless city, timezone, and ASN lookup for IP addresses.",
          how: "Queries FreeIPAPI's fast REST JSON endpoint."
        },
        {
          name: "IP.guide",
          url: "https://ip.guide/",
          badge: "Direct API",
          why: "To look up network CIDR boundaries, routing ASNs, and host ranges.",
          how: "Queries IP.guide's lightweight JSON endpoint."
        },
        {
          name: "IPLocation.net",
          url: "https://api.iplocation.net/",
          badge: "Direct API",
          why: "To provide secondary country and ISP verification.",
          how: "Queries IPLocation's keyless JSON API."
        },
        {
          name: "IP2C",
          url: "https://ip2c.org/",
          badge: "Direct API",
          why: "To rapidly resolve two-letter and three-letter country codes.",
          how: "Queries IP2C's high-speed plain text responder."
        },
        {
          name: "WTFismyIP",
          url: "https://wtfismyip.com/",
          badge: "Direct API",
          why: "To provide client public IP resolution and location checks.",
          how: "Fetches JSON IP details directly from WTFismyIP."
        },
        {
          name: "ip-api.com",
          url: "http://ip-api.com/",
          badge: "Proxy Fallback",
          why: "To fetch IP records through CORS proxies (since HTTP-only is keyless).",
          how: "Acts as a secondary proxy-friendly IP details lookup fallback."
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
        }
      ]
    },
    {
      title: "Threat Intelligence, Reputation & Vulnerabilities",
      description: "Feeds, blocklists, and vulnerability databases queried to detect malicious indicators, spam, and CVEs.",
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
          name: "urlscan.io (Scan Search)",
          url: "https://urlscan.io/",
          badge: "Direct API",
          why: "To list recent public crawler runs, screenshots, and security classifications.",
          how: "Queries urlscan.io search endpoint for matching scan IDs and assets."
        },
        {
          name: "CIRCL CVE-Search",
          url: "https://cve.circl.lu/",
          badge: "Direct API",
          why: "To lookup full CVE vulnerability records, CWE classifications, and advisories.",
          how: "Queries CIRCL's open-source CVE search API."
        },
        {
          name: "OSV API",
          url: "https://api.osv.dev/",
          badge: "Direct API",
          why: "To lookup open-source vulnerability records across package ecosystems.",
          how: "Queries Open Source Vulnerabilities database by vulnerability ID."
        },
        {
          name: "CISA KEV Catalog",
          url: "https://www.cisa.gov/",
          badge: "Data Fetch",
          why: "To verify whether a vulnerability is listed in the Known Exploited Vulnerabilities catalog.",
          how: "Directly queries CISA's official JSON feed."
        },
        {
          name: "Blocklist.de",
          url: "https://api.blocklist.de/",
          badge: "Direct API",
          why: "To check IP abuse reports from Fail2ban attack sensors.",
          how: "Queries Blocklist.de's reporting API."
        },
        {
          name: "StopForumSpam",
          url: "https://www.stopforumspam.com/",
          badge: "Direct API",
          why: "To check if IP addresses or domains are associated with spam forum activity.",
          how: "Queries StopForumSpam's API."
        },
        {
          name: "Sucuri SiteCheck",
          url: "https://sitecheck.sucuri.net/",
          badge: "Direct API",
          why: "To check website blacklists, malware classifications, and defacements.",
          how: "Queries Sucuri's public scan endpoint."
        }
      ]
    },
    {
      title: "Shodan Intelligence & Tools",
      description: "External services and API data provided by Shodan for network and security scanning.",
      sources: [
        {
          name: "Shodan InternetDB",
          url: "https://internetdb.shodan.io/",
          badge: "Direct API",
          why: "To fetch fast, offline-compiled open ports and vulnerabilities for IP addresses.",
          how: "Queries the Shodan InternetDB REST endpoint."
        },
        {
          name: "Shodan CVEDB",
          url: "https://cvedb.shodan.io/",
          badge: "Direct API",
          why: "To lookup CVE descriptions, CVSS scores, and EPS metrics.",
          how: "Queries the Shodan CVEDB REST endpoint."
        },
        {
          name: "Shodan Geonet",
          url: "https://geonet.shodan.io/",
          badge: "Direct API",
          why: "To perform global ping measurements from different geographic locations.",
          how: "Queries the Shodan Geonet ping tool API."
        },
        {
          name: "Shodan EntityDB",
          url: "https://entitydb.shodan.io/",
          badge: "Direct API",
          why: "To lookup public companies, associated ASNs, and financial data.",
          how: "Queries the Shodan EntityDB using ticker symbols."
        },
        {
          name: "shdn.io (Quick IP Check)",
          url: "https://shdn.io/",
          badge: "Data Fetch",
          why: "A fast, external way to check your own IP address and its exposure.",
          how: "Users can visit the URL directly in their browser for quick diagnostics."
        }
      ]
    },
    {
      title: "Corporate & Entity Intelligence",
      description: "Public company registries, financial metrics, and corporate logos.",
      sources: [
        {
          name: "Clearbit Company Autocomplete",
          url: "https://clearbit.com/",
          badge: "Direct API",
          why: "To suggest company domains, legal names, and logos in real-time.",
          how: "Queries Clearbit's keyless company suggest API."
        },
        {
          name: "Yahoo Finance Search",
          url: "https://finance.yahoo.com/",
          badge: "Direct API",
          why: "To map public entities to stock tickers and market exchanges.",
          how: "Queries Yahoo Finance's search endpoint."
        },
        {
          name: "SEC EDGAR Submissions",
          url: "https://www.sec.gov/edgar",
          badge: "Direct API",
          why: "To retrieve official US SEC corporate CIK filings and metadata.",
          how: "Queries the SEC EDGAR company submission API."
        }
      ]
    },
    {
      title: "MAC Address Databases (OUI)",
      description: "Directories queried to parse network card manufacturers and OUI blocks.",
      sources: [
        {
          name: "Troubleshooting.tools",
          url: "https://api.troubleshooting.tools/",
          badge: "Direct API",
          why: "To resolve hardware manufacturer names with high accuracy.",
          how: "Queries their keyless MAC lookup API endpoint."
        },
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
      title: "Connectivity Channels & Browser Extension",
      description: "Engines and extensions used to bypass browser Cross-Origin Resource Sharing restrictions securely.",
      sources: [
        {
          name: "Noob31's MultiTools Helper (Browser Extension)",
          url: "https://github.com/Noob31Gen/noob31-multitool/tree/main/extension",
          badge: "Extension Helper",
          why: "To execute cross-origin requests with native browser speed and zero external proxy dependency.",
          how: "Communicates via secure window.postMessage bridge with domain-salted SHA-256 auth and domain whitelist filtering."
        },
        {
          name: "Corsproxy.io",
          url: "https://corsproxy.io/",
          badge: "Proxy Fallback",
          why: "To act as a fallback proxy resolver when direct browser fetching is blocked by CORS.",
          how: "Injects CORS headers dynamically onto target HTTP queries."
        }
      ]
    }
  ];

  const getBadgeVariant = (type: SourceItem["badge"]) => {
    switch (type) {
      case "DNS Query": return "default";
      case "Direct API": return "secondary";
      case "Extension Helper": return "default";
      case "Proxy Fallback": return "outline";
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
          To maintain maximum privacy, performance, and accessibility, this application utilizes keyless queries, a companion browser extension with domain filtering, cascading CORS proxies, and secure DoH resolvers. Below is the full directory of all data sources used.
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