import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Settings, AlertCircle, ExternalLink, Globe, Server, RotateCcw } from "lucide-react"
import { useSettings, defaultSettings, type AppSettings } from "@/lib/settings"
import { safeStorage } from "@/lib/storage"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
export function SettingsSheet() {
  const { settings, setSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [isOpen, setIsOpen] = useState(false);
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setLocalSettings(settings);
    }
  };
  const handleApply = () => {
    setSettings(localSettings);
    safeStorage.setItem('url-scanner-settings', JSON.stringify(localSettings));
    setIsOpen(false);
  };
  const handleReset = () => {
    setSettings(defaultSettings);
    safeStorage.setItem('url-scanner-settings', JSON.stringify(defaultSettings));
    setIsOpen(false);
  };
  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="p-0 overflow-hidden !inset-y-2 !right-2 !h-[calc(100dvh-1rem)] rounded-2xl border border-border shadow-2xl sm:max-w-md flex flex-col bg-background">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <SheetTitle className="text-xl font-bold">Settings</SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground/80 leading-normal mt-1.5 pr-4">
            Configure secure DNS lookup and CORS proxy settings. BEWARE: Using a CORS Proxy routes queries through that server.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 px-6 space-y-6 min-h-0 pr-4 scrollbar-thin">
          {!settings.persistenceEnabled && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/5 text-yellow-600 dark:text-yellow-500 text-[13px] leading-relaxed">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>For settings to persist on reload, cookies must be enabled.</p>
            </div>
          )}

          {/* DNS Settings Card */}
          <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <Globe className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">DNS Settings</h4>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">DoH Provider</label>
              <Select
                value={localSettings.dohProvider}
                onValueChange={(val: string) => setLocalSettings({ ...localSettings, dohProvider: val as AppSettings['dohProvider'] })}
              >
                <SelectTrigger className="h-9 text-sm bg-background border-border/60">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Fallback Pool)</SelectItem>
                  <SelectItem value="google">Google Public DNS</SelectItem>
                  <SelectItem value="cloudflare">Cloudflare DNS</SelectItem>
                  <SelectItem value="alidns">AliDNS</SelectItem>
                  <SelectItem value="adguard">AdGuard DNS</SelectItem>
                  <SelectItem value="custom">Custom DNS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Custom DNS URL</label>
              <Input
                placeholder="https://dns.google/resolve"
                value={localSettings.customDnsUrl}
                onChange={(e) => setLocalSettings({ ...localSettings, customDnsUrl: e.target.value })}
                disabled={localSettings.dohProvider !== 'custom'}
                className="h-9 text-sm bg-background disabled:opacity-50 disabled:bg-muted/30"
              />
            </div>
          </div>

          {/* CORS Proxy Settings Card */}
          <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <Server className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CORS Settings</h4>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">CORS Proxy Provider</label>
              <Select
                value={localSettings.corsProvider}
                onValueChange={(val: string) => setLocalSettings({ ...localSettings, corsProvider: val as AppSettings['corsProvider'] })}
              >
                <SelectTrigger className="h-9 text-sm bg-background border-border/60">
                  <SelectValue placeholder="Select proxy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto Fallback (Recommended)</SelectItem>
                  <SelectItem value="none">None (Direct Request)</SelectItem>
                  <SelectItem value="corsproxy">CORSProxy</SelectItem>
                  <SelectItem value="custom">Custom CORS Proxy</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-1.5 px-0.5 mt-1">
                <span className="text-[10px] text-muted-foreground">Want custom hosting?</span>
                <a
                  href="https://github.com/Noob31Gen/WorkersProxy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Setup your own proxy <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Custom CORS URL</label>
              <Input
                placeholder="https://corsproxy.io/?"
                value={localSettings.customCorsUrl}
                onChange={(e) => setLocalSettings({ ...localSettings, customCorsUrl: e.target.value })}
                disabled={localSettings.corsProvider !== 'custom'}
                className="h-9 text-sm bg-background disabled:opacity-50 disabled:bg-muted/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Custom CORS Proxy Token</label>
              <Input
                type="password"
                placeholder="Bearer Token (Optional)"
                value={localSettings.customCorsToken || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, customCorsToken: e.target.value })}
                disabled={localSettings.corsProvider !== 'custom'}
                className="h-9 text-sm bg-background disabled:opacity-50 disabled:bg-muted/30"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 p-4 bg-muted/20 flex gap-3 shrink-0">
          <Button variant="outline" onClick={handleReset} className="flex-1 transition-all active:scale-95 text-xs h-9">
            <RotateCcw className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            Reset Defaults
          </Button>
          <Button onClick={handleApply} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 text-xs h-9 font-semibold">
            Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}