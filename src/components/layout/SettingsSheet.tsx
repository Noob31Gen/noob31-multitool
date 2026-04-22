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
import { useSettings } from "@/lib/settings"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SettingsSheet() {
  const { settings, setSettings } = useSettings();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Configure API keys and preferences. Keys are stored locally in your browser.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-8 py-8 px-2">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">DoH Provider</h3>
            <Select 
              value={settings.dohProvider} 
              onValueChange={(val: 'google' | 'cloudflare' | 'alidns' | 'adguard') => setSettings({ ...settings, dohProvider: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google Public DNS</SelectItem>
                <SelectItem value="cloudflare">Cloudflare DNS</SelectItem>
                <SelectItem value="alidns">AliDNS</SelectItem>
                <SelectItem value="adguard">AdGuard DNS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-medium">CORS Proxy URL</h3>
            <Input 
              placeholder="https://corsproxy.io/?" 
              value={settings.corsProxyUrl}
              onChange={(e) => setSettings({ ...settings, corsProxyUrl: e.target.value })}
            />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-medium">IPinfo Token (Optional)</h3>
            <Input 
              type="password"
              placeholder="Enter API token" 
              value={settings.apiKeys.ipinfo}
              onChange={(e) => setSettings({ 
                ...settings, 
                apiKeys: { ...settings.apiKeys, ipinfo: e.target.value } 
              })}
            />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Spamhaus DQS Key (Optional)</h3>
            <Input 
              type="password"
              placeholder="Enter DQS key" 
              value={settings.apiKeys.spamhausDqs}
              onChange={(e) => setSettings({ 
                ...settings, 
                apiKeys: { ...settings.apiKeys, spamhausDqs: e.target.value } 
              })}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
