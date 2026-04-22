import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { SettingsSheet } from "./SettingsSheet"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { SuperToolSearch } from "@/components/shared/SuperToolSearch"
import { SidebarNav } from "./Sidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      
      <div className="flex items-center gap-2 font-semibold md:w-64">
        <Link to="/" className="text-xl tracking-tight hidden md:block">Noob31's MultiTool</Link>
        <Link to="/" className="text-xl tracking-tight md:hidden">NM</Link>
      </div>

      <div className="flex-1 flex justify-center max-w-2xl px-4">
        {!isLandingPage && <SuperToolSearch className="relative w-full" />}
      </div>

      <div className="flex items-center gap-2 justify-end md:w-64">
        <ThemeToggle />
        <SettingsSheet />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="ml-2">
              <Menu className="mr-2 h-4 w-4" />
              All Tools
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-16 items-center border-b px-6">
              <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2 font-semibold">
                <span className="text-xl tracking-tight">Noob31's MultiTool</span>
              </Link>
            </div>
            <div className="overflow-auto py-4 h-[calc(100vh-4rem)]">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

