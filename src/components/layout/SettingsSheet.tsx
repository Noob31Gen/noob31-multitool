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
import { Settings, AlertCircle } from "lucide-react"
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
    window.location.reload();
  };
  const handleReset = () => {
    setSettings(defaultSettings);
    safeStorage.setItem('url-scanner-settings', JSON.stringify(defaultSettings));
    window.location.reload();
  };
  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto !inset-y-2 !right-2 !h-[calc(100dvh-1rem)] rounded-2xl border border-border shadow-2xl sm:max-w-md">
        <SheetHeader>
          <div className="flex justify-between items-center pr-6">
            <SheetTitle>Settings</SheetTitle>
            <Button variant="destructive" size="sm" onClick={handleReset}>Reset Defaults</Button>
          </div>
          <SheetDescription>
            Configure DNS and CORS settings. Do not forget to click 'Apply' to save changes. BEWARE: Using a CORS Proxy means the proxy will see your queries.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-8 py-8 px-4">
          {!settings.persistenceEnabled && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/5 text-yellow-600 dark:text-yellow-500 text-[13px] leading-relaxed">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>For settings to persist on reload, cookies must be enabled.</p>
            </div>
          )}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">DoH Provider</h3>
            <Select
              value={localSettings.dohProvider}
              onValueChange={(val: string) => setLocalSettings({ ...localSettings, dohProvider: val as AppSettings['dohProvider'] })}
            >
              <SelectTrigger>
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
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Custom DNS URL</h3>
            <Input
              placeholder="https://dns.google/resolve"
              value={localSettings.customDnsUrl}
              onChange={(e) => setLocalSettings({ ...localSettings, customDnsUrl: e.target.value })}
              disabled={localSettings.dohProvider !== 'custom'}
            />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-medium">CORS Proxy Provider</h3>
            <Select
              value={localSettings.corsProvider}
              onValueChange={(val: string) => setLocalSettings({ ...localSettings, corsProvider: val as AppSettings['corsProvider'] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select proxy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Direct Request)</SelectItem>
                <SelectItem value="codetabs">CodeTabs (Recommended)</SelectItem>
                <SelectItem value="corsproxy">CORSProxy</SelectItem>
                <SelectItem value="allorigins">AllOrigins</SelectItem>
                <SelectItem value="thingproxy">ThingProxy</SelectItem>
                <SelectItem value="corsanywhere">CORS Anywhere</SelectItem>
                <SelectItem value="custom">Custom CORS Proxy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Custom CORS URL</h3>
            <Input
              placeholder="https://corsproxy.io/?"
              value={localSettings.customCorsUrl}
              onChange={(e) => setLocalSettings({ ...localSettings, customCorsUrl: e.target.value })}
              disabled={localSettings.corsProvider !== 'custom'}
            />
          </div>
          <Button onClick={handleApply} className="w-full mt-4">Apply</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}