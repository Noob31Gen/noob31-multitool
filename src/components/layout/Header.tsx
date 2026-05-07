import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { SettingsSheet } from "./SettingsSheet"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { SuperToolSearch } from "@/components/shared/SuperToolSearch"
import { SidebarNav } from "./Sidebar"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, Cookie } from "lucide-react"
import { useSettings } from "@/lib/settings"
import { Switch } from "@/components/ui/switch"
import SiteLogo from "@/assets/sitelogo.png"
export function Header() {
  const { settings, setSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex h-16 items-center justify-between px-3 sm:px-6">
      <div className="flex items-center gap-2 font-semibold md:w-auto">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="hidden md:flex rounded-xl px-4 h-10 border-muted-foreground/20 bg-muted/20 hover:bg-muted/40 transition-all">
              <Menu className="mr-2 h-5 w-5" />
              All Tools
            </Button>
          </SheetTrigger>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden rounded-xl h-10 w-10 border-muted-foreground/20 bg-muted/20">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 !inset-y-2 !left-2 !h-[calc(100dvh-1rem)] rounded-2xl border border-border shadow-2xl overflow-hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Access all tools and utilities.</SheetDescription>
            </SheetHeader>
            <div className="flex h-16 items-center border-b px-6">
              <Link to="/" onClick={() => setOpen(false)} className="flex items-center">
                <img src={SiteLogo} alt="Logo" className="h-8 w-auto" />
              </Link>
            </div>
            <div className="overflow-auto py-4 h-[calc(100dvh-5rem)]">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        <Link to="/" className="flex items-center ml-2 transition-transform hover:scale-105">
          <img src={SiteLogo} alt="Noob31" className="h-8 md:h-10 w-auto" />
        </Link>
      </div>
      <div className="flex-1 hidden md:flex justify-center max-w-2xl px-2 min-w-0">
        {!isLandingPage && <SuperToolSearch className="relative w-full" />}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3 justify-end md:w-auto min-w-fit">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 border border-transparent hover:border-border transition-colors group">
          <Cookie className={`h-4 w-4 transition-colors ${settings.persistenceEnabled ? "text-primary" : "text-muted-foreground opacity-40"}`} />
          <Switch 
            id="persistence-mode"
            checked={settings.persistenceEnabled}
            onCheckedChange={(checked) => setSettings({ ...settings, persistenceEnabled: checked })}
            className="scale-75 origin-right"
          />
        </div>
        <ThemeToggle />
        <SettingsSheet />
      </div>
    </header>
  )
}