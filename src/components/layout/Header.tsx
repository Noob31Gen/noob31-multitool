import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { SettingsSheet } from "./SettingsSheet"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { SuperToolSearch } from "@/components/shared/SuperToolSearch"
import { SidebarNav } from "./Sidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import SiteLogo from "@/assets/sitelogo.png"

export function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-background/95 px-3 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">

      <div className="flex items-center gap-2 font-semibold md:w-auto">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="mr-2 hidden md:flex">
              <Menu className="mr-2 h-4 w-4" />
              All Tools
            </Button>
          </SheetTrigger>
          {/* Mobile version of the button (just icon) can be displayed instead on small screens if desired, but we'll stick to text as requested, or just use icon on mobile to save space */}
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="mr-2 md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-16 items-center border-b px-6">
              <Link to="/" onClick={() => setOpen(false)} className="flex items-center">
                <img src={SiteLogo} alt="Logo" className="h-8 w-auto" />
              </Link>
            </div>
            <div className="overflow-auto py-4 h-[calc(100vh-4rem)]">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center">
          {/* Replace src with your actual logo path, e.g., "/logo.png" */}
          <img src={SiteLogo} alt="Logo" className="h-8 w-auto hidden md:block" />
        </Link>
      </div>

      <div className="flex-1 flex justify-center max-w-2xl px-2 sm:px-4 min-w-0">
        {!isLandingPage && <SuperToolSearch className="relative w-full" />}
      </div>

      <div className="flex items-center gap-2 justify-end md:w-auto min-w-[80px]">
        <ThemeToggle />
        <SettingsSheet />
      </div>
    </header>
  )
}

