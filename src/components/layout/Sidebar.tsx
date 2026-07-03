import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
const TOOL_CATEGORIES = [
  {
    title: "Lookup",
    tools: [
      { name: "DNS Lookup", path: "/dns/a" },
      { name: "Reverse DNS Lookup", path: "/network/reverse-dns" },
      { name: "DNSSEC Lookup", path: "/dnssec/dnskey" },
      { name: "Email Auth Lookup", path: "/email/spf" },
      { name: "CERT Lookup", path: "/security/cert" },
      { name: "What Is My IP?", path: "/network/my-ip" },
      { name: "IP and Registration Lookup", path: "/registration/whois" },
      { name: "Public Company Lookup", path: "/registration/company" },
      { name: "MAC Address Lookup", path: "/network/mac-lookup" },
    ],
  },
  {
    title: "Checks & Analysers",
    tools: [
      { name: "Domain Health", path: "/health/domain" },
      { name: "Email Deliverability", path: "/health/deliverability" },
      { name: "IP Blacklist Check", path: "/security/blacklist" },
      { name: "Domain Reputation", path: "/security/domain-reputation" },
      { name: "URL Scanner", path: "/network/url-scanner" },
      { name: "Subdomain Scanner", path: "/network/subdomains" },
      { name: "Global Ping", path: "/network/global-ping" },
      { name: "HTTP Headers", path: "/network/http/http" },
      { name: "Email Header Analyzer", path: "/bonus/headers" },
      { name: "Threat Intel Explorer", path: "/security/threat-intel" },
      { name: "CVE Lookup", path: "/security/cve" },
    ],
  },
  {
    title: "Utilities & Generators",
    tools: [
      { name: "SPF Generator", path: "/bonus/spf-generator" },
      { name: "DMARC Generator", path: "/bonus/dmarc-generator" },
      { name: "Subnet Calculator", path: "/bonus/subnet" },
      { name: "Network Visualizer", path: "/bonus/visualizer" },
      { name: "QR & Barcode Generator", path: "/bonus/code-generator" },
      { name: "QR & Barcode Scanner", path: "/bonus/code-scanner" },
    ],
  },
]
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const linkClass = (path: string) => cn(
    "flex w-full items-center rounded-md border border-transparent px-2.5 py-1.5 hover:bg-muted/50 hover:text-foreground transition-colors text-muted-foreground",
    location.pathname === path && "bg-muted font-semibold text-foreground"
  );

  return (
    <nav className="grid items-start px-4 text-sm font-medium pb-16 gap-1">
      <div className="mb-4">
        <h4 className="mb-2 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
          General
        </h4>
        <div className="grid grid-flow-row auto-rows-max text-sm gap-0.5">
          <Link
            to="/"
            onClick={onNavigate}
            className={linkClass("/")}
          >
            Home
          </Link>
          <Link
            to="/about/info"
            onClick={onNavigate}
            className={linkClass("/about/info")}
          >
            About
          </Link>
          <Link
            to="/about/credits"
            onClick={onNavigate}
            className={linkClass("/about/credits")}
          >
            Credits
          </Link>
          <Link
            to="/about/features"
            onClick={onNavigate}
            className={linkClass("/about/features")}
          >
            Index
          </Link>
        </div>
      </div>
      {TOOL_CATEGORIES.map((category) => (
        <div key={category.title} className="mb-4">
          <h4 className="mb-2 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
            {category.title}
          </h4>
          <div className="grid grid-flow-row auto-rows-max text-sm gap-0.5">
            {category.tools.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                onClick={onNavigate}
                className={linkClass(tool.path)}
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