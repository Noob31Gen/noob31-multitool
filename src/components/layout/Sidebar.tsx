import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"

const TOOL_CATEGORIES = [
  {
    title: "DNS Lookups",
    tools: [
      { name: "A Lookup", path: "/dns/a" },
      { name: "AAAA Lookup", path: "/dns/aaaa" },
      { name: "CNAME Lookup", path: "/dns/cname" },
      { name: "MX Lookup", path: "/dns/mx" },
      { name: "TXT Lookup", path: "/dns/txt" },
      { name: "SOA Lookup", path: "/dns/soa" },
      { name: "NS Lookup", path: "/dns/ns" },
      { name: "SRV Lookup", path: "/dns/srv" },
      { name: "LOC Lookup", path: "/dns/loc" },
      { name: "Reverse Lookup", path: "/dns/ptr" },
    ],
  },
  {
    title: "DNSSEC",
    tools: [
      { name: "DNSKEY Lookup", path: "/dnssec/dnskey" },
      { name: "DS Lookup", path: "/dnssec/ds" },
      { name: "NSEC Lookup", path: "/dnssec/nsec" },
      { name: "NSEC3PARAM Lookup", path: "/dnssec/nsec3param" },
      { name: "RRSIG Lookup", path: "/dnssec/rrsig" },
    ],
  },
  {
    title: "Email Auth",
    tools: [
      { name: "SPF Lookup", path: "/email/spf" },
      { name: "DKIM Lookup", path: "/email/dkim" },
      { name: "DMARC Lookup", path: "/email/dmarc" },
      { name: "BIMI Lookup", path: "/email/bimi" },
      { name: "MTA-STS Lookup", path: "/email/mta-sts" },
      { name: "TLSRPT Lookup", path: "/email/tlsrpt" },
    ],
  },
  {
    title: "Network",
    tools: [
      { name: "What Is My IP?", path: "/network/my-ip" },
      { name: "HTTP Lookup", path: "/network/http" },
      { name: "HTTPS Lookup", path: "/network/https" },
      { name: "IPSECKEY Lookup", path: "/network/ipseckey" },
    ],
  },
]

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="hidden border-r bg-muted/40 md:block w-64 h-full overflow-y-auto">
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">URL Scanner</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-4 text-sm font-medium">
          {TOOL_CATEGORIES.map((category) => (
            <div key={category.title} className="mb-4">
              <h4 className="mb-1 rounded-md px-2 py-1 text-sm font-semibold tracking-tight">
                {category.title}
              </h4>
              <div className="grid grid-flow-row auto-rows-max text-sm">
                {category.tools.map((tool) => (
                  <Link
                    key={tool.path}
                    to={tool.path}
                    className={cn(
                      "flex w-full items-center rounded-md border border-transparent px-2 py-1 hover:underline text-muted-foreground",
                      location.pathname === tool.path && "bg-muted font-medium text-foreground"
                    )}
                  >
                    {tool.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}
