import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { SettingsSheet } from "./SettingsSheet"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { SuperToolSearch } from "@/components/shared/SuperToolSearch"
import { SidebarNav } from "./Sidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 h-16">
      <div className="flex items-center gap-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <img src={SiteLogo} alt="Logo" className="w-8 h-8 rounded-lg" />
                  <span className="font-bold text-lg">MultiTool</span>
                </div>
              </div>
              <SidebarNav />
            </div>
          </SheetContent>
        </Sheet>
        
        <Link to="/" className="flex items-center gap-2">
          <img src={SiteLogo} alt="Logo" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-lg hidden sm:inline-block">Noob31's MultiTool</span>
        </Link>
      </div>

      <div className="flex-1 flex justify-center max-w-2xl px-2 sm:px-4 min-w-0">
        {!isLandingPage && <SuperToolSearch className="relative w-full" />}
      </div>

      <div className="flex items-center gap-3 justify-end md:w-auto min-w-[120px]">
        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-muted/50 border border-transparent hover:border-border transition-colors group">
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
