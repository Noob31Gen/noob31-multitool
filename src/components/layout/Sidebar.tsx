import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

const TOOL_CATEGORIES = [
  {
    title: "Core Lookups",
    tools: [
      { name: "DNS Lookup", path: "/dns/a" },
      { name: "DNSSEC Lookup", path: "/dnssec/dnskey" },
      { name: "Email Auth Lookup", path: "/email/spf" },
      { name: "Registration Lookup", path: "/registration/whois" },
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
]

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
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

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden border-r bg-muted/40 md:block w-64 h-full overflow-y-auto">
        <div className="flex h-16 items-center border-b px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="text-xl">Noob31's MultiTool</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <SidebarNav />
        </div>
      </div>

      {/* Mobile hamburger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed top-3 left-3 z-50">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-16 items-center border-b px-6">
            <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2 font-semibold">
              <span className="text-xl">Noob31's MultiTool</span>
            </Link>
          </div>
          <div className="overflow-auto py-4 h-[calc(100vh-4rem)]">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

