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
import { Settings, AlertCircle, ExternalLink, Server, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { useSettings, defaultSettings, type AppSettings } from "@/lib/settings"
import { safeStorage } from "@/lib/storage"
import { testServerConnection, type ServerConnectionTestResult } from "@/lib/apiServer"
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
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<ServerConnectionTestResult | null>(null);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setLocalSettings(settings);
      setTestStatus('idle');
      setTestResult(null);
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
    setTestStatus('idle');
    setTestResult(null);
    setIsOpen(false);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestResult(null);
    try {
      const res = await testServerConnection(localSettings);
      setTestResult(res);
      setTestStatus(res.ok ? 'success' : 'error');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({
        ok: false,
        status: 500,
        statusText: 'Failed',
        latencyMs: 0,
        errorMessage: msg,
      });
      setTestStatus('error');
    }
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
          <SheetTitle className="text-lg font-bold">Settings</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground/80 leading-normal mt-1 pr-4">
            Configure query resolution server, secure DNS, and CORS proxy preferences.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 px-6 space-y-8 min-h-0 pr-4 scrollbar-thin">
          {!settings.persistenceEnabled && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/5 text-yellow-600 dark:text-yellow-500 text-[13px] leading-relaxed">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>For settings to persist on reload, cookies must be enabled.</p>
            </div>
          )}

          {/* Custom API Server Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 px-0.5">
              <Server className="w-3.5 h-3.5 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Query Resolution Engine</h4>
            </div>

            <div className="space-y-4 pl-0.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Resolution Mode</label>
                <Select
                  value={localSettings.serverMode || 'browser'}
                  onValueChange={(val: string) => setLocalSettings({ ...localSettings, serverMode: val as AppSettings['serverMode'] })}
                >
                  <SelectTrigger className="h-9 text-sm bg-background border-border/60">
                    <SelectValue placeholder="Select resolution mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser">Browser Direct (Client-Side / Local)</SelectItem>
                    <SelectItem value="custom">Custom API Server (Edge / Worker Relay)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground leading-normal mt-1">
                  {localSettings.serverMode === 'custom'
                    ? 'All network queries, DNS lookups, and threat intel are resolved via your custom server endpoint.'
                    : 'All diagnostics run 100% locally in your browser with zero data retention.'}
                </p>
              </div>

              {localSettings.serverMode === 'custom' && (
                <div className="space-y-3.5 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Custom Server URL</label>
                    <Input
                      placeholder="https://api.yourdomain.com"
                      value={localSettings.customServerUrl || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, customServerUrl: e.target.value })}
                      className="h-9 text-sm bg-background"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Base URL of your Cloudflare Worker or backend API instance.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Authentication Token / API Key</label>
                    <Input
                      type="password"
                      placeholder="Bearer Token (Optional)"
                      value={localSettings.customServerToken || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, customServerToken: e.target.value })}
                      className="h-9 text-sm bg-background"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Sent as Authorization: Bearer &lt;token&gt;. Basic auth in URL (https://user:pass@host) is also supported.
                    </span>
                  </div>

                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={testStatus === 'testing' || !localSettings.customServerUrl?.trim()}
                      className="w-full text-xs h-8 gap-2 bg-background"
                    >
                      {testStatus === 'testing' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Testing Connection...
                        </>
                      ) : (
                        <>
                          <Server className="w-3.5 h-3.5" />
                          Test Server Connection
                        </>
                      )}
                    </Button>

                    {testResult && (
                      <div className={`mt-2.5 p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
                        testResult.ok
                          ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
                          : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
                      }`}>
                        {testResult.ok ? (
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        )}
                        <div className="space-y-0.5">
                          <p className="font-semibold">
                            {testResult.ok ? `Connected (${testResult.latencyMs}ms)` : 'Connection Failed'}
                          </p>
                          <p className="text-[11px] opacity-90">
                            {testResult.ok
                              ? `${testResult.service || 'API Server'}${testResult.version ? ` v${testResult.version}` : ''} responded successfully.`
                              : testResult.errorMessage || 'Unable to connect to the custom server.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DNS Settings */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 px-0.5">DNS Settings</h4>
            
            <div className="space-y-4 pl-0.5">
              <div className="space-y-1.5">
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

              <div className="space-y-1.5">
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
          </div>

          {/* CORS Settings */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 px-0.5">CORS Settings</h4>
            
            <div className="space-y-4 pl-0.5">
              <div className="space-y-1.5">
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Custom CORS URL</label>
                <Input
                  placeholder="https://corsproxy.io/?"
                  value={localSettings.customCorsUrl}
                  onChange={(e) => setLocalSettings({ ...localSettings, customCorsUrl: e.target.value })}
                  disabled={localSettings.corsProvider !== 'custom'}
                  className="h-9 text-sm bg-background disabled:opacity-50 disabled:bg-muted/30"
                />
              </div>

              <div className="space-y-1.5">
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
        </div>

        <div className="border-t border-border/40 p-4 flex gap-3 shrink-0">
          <Button variant="outline" onClick={handleReset} className="flex-1 text-xs h-9 transition-all active:scale-95">
            Reset Defaults
          </Button>
          <Button onClick={handleApply} className="flex-1 text-xs h-9 font-semibold transition-all active:scale-95">
            Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}