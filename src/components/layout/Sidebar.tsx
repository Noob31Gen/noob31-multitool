import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
const TOOL_CATEGORIES = [
  {
    title: "Domain & Security Auditing",
    tools: [
      { name: "Domain Health", path: "/health/domain" },
      { name: "Domain Reputation", path: "/security/domain-reputation" },
      { name: "Threat Intel Explorer", path: "/security/threat-intel" },
      { name: "Email Deliverability", path: "/health/deliverability" },
      { name: "Blacklist Check", path: "/security/blacklist" },
      { name: "DNS Check", path: "/health/dns" },
      { name: "IP and Registration Lookup", path: "/registration/whois" },
      { name: "Email Auth Lookup", path: "/email/spf" },
      { name: "Email Header Analyzer", path: "/bonus/headers" },
    ],
  },
  {
    title: "DNS & Network Testing",
    tools: [
      { name: "DNS Lookup", path: "/dns/a" },
      { name: "DNSSEC Lookup", path: "/dnssec/dnskey" },
      { name: "Reverse DNS Lookup", path: "/network/reverse-dns" },
      { name: "URL Scanner", path: "/network/url-scanner" },
      { name: "Subdomain Scanner", path: "/network/subdomains" },
      { name: "CERT Lookup", path: "/security/cert" },
      { name: "HTTP Headers", path: "/network/http/http" },
      { name: "What Is My IP?", path: "/network/my-ip" },
    ],
  },
  {
    title: "Utilities & Generators",
    tools: [
      { name: "SPF Generator", path: "/bonus/spf-generator" },
      { name: "DMARC Generator", path: "/bonus/dmarc-generator" },
      { name: "Subnet Calculator", path: "/bonus/subnet" },
      { name: "MAC Address Lookup", path: "/network/mac-lookup" },
      { name: "Network Visualizer", path: "/bonus/visualizer" },
      { name: "QR & Barcode Generator", path: "/bonus/code-generator" },
      { name: "QR & Barcode Scanner", path: "/bonus/code-scanner" },
    ],
  },
  {
    title: "About",
    tools: [
      { name: "About", path: "/about/info" },
      { name: "Credits", path: "/about/credits" },
    ],
  },
]
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  return (
    <nav className="grid items-start px-4 text-sm font-medium pb-16">
      <div className="mb-4">
        <Link
          to="/"
          onClick={onNavigate}
          className={cn(
            "flex w-full items-center rounded-md border border-transparent px-2 py-1 hover:underline text-muted-foreground",
            location.pathname === "/" && "bg-muted font-medium text-foreground"
          )}
        >
          Home
        </Link>
        <Link
          to="/about/features"
          onClick={onNavigate}
          className={cn(
            "flex w-full items-center rounded-md border border-transparent px-2 py-1 hover:underline text-muted-foreground",
            location.pathname === "/about/features" && "bg-muted font-medium text-foreground"
          )}
        >
          Everything
        </Link>
      </div>
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
                onClick={onNavigate}
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
  )
}