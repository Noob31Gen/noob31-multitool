import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"

const TOOL_CATEGORIES = [
  {
    title: "Core Lookups",
    tools: [
      { name: "DNS Lookup", path: "/dns/a" },
      { name: "DNSSEC Lookup", path: "/dnssec/dnskey" },
      { name: "Email Auth Lookup", path: "/email/spf" },
      { name: "IP and Registration Lookup", path: "/registration/whois" },
    ],
  },
  {
    title: "Health & Security",
    tools: [
      { name: "DNS Check", path: "/health/dns" },
      { name: "Domain Health", path: "/health/domain" },
      { name: "Email Deliverability", path: "/health/deliverability" },
      { name: "Blacklist Check", path: "/security/blacklist" },
      { name: "CERT Lookup", path: "/security/cert" },
    ],
  },
  {
    title: "Network & Diagnostics",
    tools: [
      { name: "URL Scanner", path: "/network/url-scanner" },
      { name: "Subdomain Scanner", path: "/network/subdomains" },
      { name: "HTTP Headers", path: "/network/http/http" },
      { name: "What Is My IP?", path: "/network/my-ip" },
      { name: "Email Header Analyzer", path: "/bonus/headers" },
      { name: "Subnet Calculator", path: "/bonus/subnet" },
    ],
  },
  {
    title: "Generators",
    tools: [
      { name: "SPF Generator", path: "/bonus/spf-generator" },
      { name: "DMARC Generator", path: "/bonus/dmarc-generator" },
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
    <nav className="grid items-start px-4 text-sm font-medium">
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

