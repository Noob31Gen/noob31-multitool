import { useState, useEffect } from 'react';
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
import { Settings } from "lucide-react"
import { useSettings, defaultSettings, type AppSettings } from "@/lib/settings"
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

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  const handleApply = () => {
    setSettings(localSettings);
    localStorage.setItem('url-scanner-settings', JSON.stringify(localSettings));
    window.location.reload();
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.setItem('url-scanner-settings', JSON.stringify(defaultSettings));
    window.location.reload();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex justify-between items-center pr-6">
            <SheetTitle>Settings</SheetTitle>
            <Button variant="destructive" size="sm" onClick={handleReset}>Reset Defaults</Button>
          </div>
          <SheetDescription>
            Configure API keys and preferences. Keys are stored locally in your browser. Do not forget to click 'Apply' to save changes. BEWARE: Using a CORS Proxy means the proxy will see your API Keys.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-8 py-8 px-2">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">DoH Provider</h3>
            <Select
              value={localSettings.dohProvider}
              onValueChange={(val: any) => setLocalSettings({ ...localSettings, dohProvider: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
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
              onValueChange={(val: any) => setLocalSettings({ ...localSettings, corsProvider: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select proxy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Direct Request)</SelectItem>
                <SelectItem value="corsproxy">CORSProxy</SelectItem>
                <SelectItem value="allorigins">AllOrigins</SelectItem>
                <SelectItem value="codetabs">CodeTabs</SelectItem>
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
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Spamhaus DQS Key (Optional)</h3>
            <Input
              type="password"
              placeholder="Enter DQS key"
              value={localSettings.apiKeys.spamhausDqs}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                apiKeys: { ...localSettings.apiKeys, spamhausDqs: e.target.value }
              })}
            />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-medium">VirusTotal API Key (Optional)</h3>
            <Input
              type="password"
              placeholder="Enter VirusTotal API key"
              value={localSettings.apiKeys.virustotal}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                apiKeys: { ...localSettings.apiKeys, virustotal: e.target.value }
              })}
            />
          </div>
          <Button onClick={handleApply} className="w-full mt-4">Apply</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}