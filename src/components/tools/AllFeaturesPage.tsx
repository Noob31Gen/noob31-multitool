import { Link } from "react-router-dom"
import { SEO } from "@/components/shared/SEO"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
const FEATURE_CATEGORIES = [
  {
    title: "DNS",
    description: "Standard DNS Records",
    features: [
      { name: "A Record", path: "/dns/a" },
      { name: "AAAA Record", path: "/dns/aaaa" },
      { name: "CNAME Record", path: "/dns/cname" },
      { name: "MX Record", path: "/dns/mx" },
      { name: "TXT Record", path: "/dns/txt" },
      { name: "SOA Record", path: "/dns/soa" },
      { name: "NS Record", path: "/dns/ns" },
      { name: "SRV Record", path: "/dns/srv" },
      { name: "LOC Record", path: "/dns/loc" },
      { name: "PTR Record", path: "/dns/ptr" },
      { name: "IPSECKEY Record", path: "/dns/ipseckey" },
    ],
  },
  {
    title: "DNSSEC",
    description: "DNS Security Extensions Records.",
    features: [
      { name: "DNSKEY", path: "/dnssec/dnskey" },
      { name: "DS", path: "/dnssec/ds" },
      { name: "NSEC", path: "/dnssec/nsec" },
      { name: "NSEC3PARAM", path: "/dnssec/nsec3param" },
      { name: "RRSIG", path: "/dnssec/rrsig" },
    ],
  },
  {
    title: "Email Security",
    description: "Email Security Authentication Records",
    features: [
      { name: "SPF", path: "/email/spf" },
      { name: "DKIM", path: "/email/dkim" },
      { name: "DMARC", path: "/email/dmarc" },
      { name: "BIMI", path: "/email/bimi" },
      { name: "MTA-STS", path: "/email/mta-sts" },
      { name: "TLSRPT", path: "/email/tlsrpt" },
    ],
  },
  {
    title: "IP & Registration",
    description: "Check Domain and IP Registrations",
    features: [
      { name: "WHOIS", path: "/registration/whois" },
      { name: "ARIN", path: "/registration/arin" },
      { name: "ASN", path: "/registration/asn" },
    ],
  },
  {
    title: "Network & Diagnostics",
    description: "Check Network and Related Information",
    features: [
      { name: "URL Scanner", path: "/network/url-scanner" },
      { name: "Subdomain Scanner", path: "/network/subdomains" },
      { name: "HTTP Headers", path: "/network/http/http" },
      { name: "HTTPS Headers", path: "/network/http/https" },
      { name: "What Is My IP?", path: "/network/my-ip" },
      { name: "MAC Address Lookup", path: "/network/mac-lookup" },
    ],
  },
  {
    title: "Health & Security",
    description: "Check Domain and Email Integrity.",
    features: [
      { name: "DNS Check", path: "/health/dns" },
      { name: "Domain Health", path: "/health/domain" },
      { name: "Email Deliverability", path: "/health/deliverability" },
      { name: "Blacklist Check", path: "/security/blacklist" },
      { name: "CERT Lookup", path: "/security/cert" },
    ],
  },
  {
    title: "Miscellaneous",
    description: "Additional Tools and Generators.",
    features: [
      { name: "Email Header Analyzer", path: "/bonus/headers" },
      { name: "Subnet Calculator", path: "/bonus/subnet" },
      { name: "SPF Generator", path: "/bonus/spf-generator" },
      { name: "DMARC Generator", path: "/bonus/dmarc-generator" },
      { name: "QR/Bar Code Generator", path: "/bonus/code-generator" },
      { name: "QR/BarCode Scanner", path: "/bonus/code-scanner" },
    ],
  },
]
export function AllFeaturesPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <SEO
        title="All Features & Tools"
        description="A complete directory of all network, DNS, and security tools available in Noob31's MultiTools."
        url="https://tools.noob31.com/about/features"
      />
      <div className="text-center space-y-4">
        <h1 className="font-brand text-3xl sm:text-4xl font-extrabold tracking-tight">All Features</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Here is everything this project is currently capable of.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {FEATURE_CATEGORIES.map((category) => (
          <Card key={category.title} className="flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{category.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {category.features.map((feature) => (
                  <Button
                    key={feature.path}
                    variant="outline"
                    className="w-full justify-start text-xs h-9 overflow-hidden text-ellipsis whitespace-nowrap"
                    asChild
                  >
                    <Link to={feature.path} title={feature.name}>
                      {feature.name}
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}