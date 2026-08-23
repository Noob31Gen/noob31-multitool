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
import { Settings, AlertCircle, ExternalLink, Download } from "lucide-react"
import { useSettings, defaultSettings, type AppSettings } from "@/lib/settings"
import { safeStorage } from "@/lib/storage"
import { subscribeExtensionStatus, pingExtension, type ExtensionStatus } from "@/lib/extensionBridge"
import { downloadExtensionZip } from "@/lib/extensionDownloader"
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
  const [extStatus, setExtStatus] = useState<ExtensionStatus>({ isAvailable: false });
  const [passwordInput, setPasswordInput] = useState('');
  const [hasSavedPassword, setHasSavedPassword] = useState(false);

  useEffect(() => {
    return subscribeExtensionStatus(setExtStatus);
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setLocalSettings(settings);
      setPasswordInput('');
      setHasSavedPassword(Boolean(settings.extensionPassword));
      pingExtension(settings.extensionPassword);
    }
  };

  const handleDownloadExtension = (e: React.MouseEvent) => {
    e.preventDefault();
    downloadExtensionZip();
  };

  const handleApply = () => {
    const finalPassword = passwordInput.trim()
      ? passwordInput.trim()
      : hasSavedPassword
      ? (localSettings.extensionPassword || settings.extensionPassword || '')
      : '';
    const updatedSettings = { ...localSettings, extensionPassword: finalPassword };
    setSettings(updatedSettings);
    safeStorage.setItem('url-scanner-settings', JSON.stringify(updatedSettings));
    setIsOpen(false);
  };
  const handleReset = () => {
    setPasswordInput('');
    setHasSavedPassword(false);
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
      <SheetContent className="p-0 overflow-hidden !inset-y-0 !right-0 !w-full sm:!w-[420px] sm:!max-w-md sm:!inset-y-2 sm:!right-2 sm:!h-[calc(100dvh-1rem)] sm:rounded-2xl border-l sm:border border-border shadow-2xl flex flex-col bg-background">
        <SheetHeader className="px-4 sm:px-6 pt-5 pb-4 border-b border-border/40 shrink-0">
          <SheetTitle className="text-lg font-bold">Settings</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground/80 leading-normal mt-1 pr-4">
            Configure secure DNS lookup, CORS proxy, and custom query resolution server preferences.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-5 px-4 sm:px-6 space-y-6 min-h-0 scrollbar-thin">
          {!settings.persistenceEnabled && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/5 text-yellow-600 dark:text-yellow-500 text-[13px] leading-relaxed">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>For settings to persist on reload, cookies must be enabled.</p>
            </div>
          )}

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
                  <SelectTrigger className="w-full h-9 text-sm bg-background border-border/60 min-w-0 [&>span]:truncate">
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

              {localSettings.dohProvider === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Custom DNS URL</label>
                  <Input
                    placeholder="https://dns.google/resolve"
                    value={localSettings.customDnsUrl}
                    onChange={(e) => setLocalSettings({ ...localSettings, customDnsUrl: e.target.value })}
                    className="h-9 text-sm bg-background"
                  />
                </div>
              )}
            </div>
          </div>

          {/* CORS Settings */}
          {localSettings.serverMode !== 'custom' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 px-0.5">CORS Settings</h4>
              
              <div className="space-y-4 pl-0.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <span>CORS Provider</span>
                    {localSettings.corsProvider === 'extension' && (
                      <span className={`text-[10px] font-normal flex items-center gap-1 shrink-0 ${extStatus.isAvailable ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${extStatus.isAvailable ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                        {extStatus.isAvailable ? 'Connected' : 'Not Detected'}
                      </span>
                    )}
                  </label>
                  <Select
                    value={localSettings.corsProvider}
                    onValueChange={(val: string) => setLocalSettings({ ...localSettings, corsProvider: val as AppSettings['corsProvider'] })}
                  >
                    <SelectTrigger className="w-full h-9 text-sm bg-background border-border/60 min-w-0 [&>span]:truncate">
                      <SelectValue placeholder="Select proxy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto Fallback (Recommended)</SelectItem>
                      <SelectItem value="extension">Browser Extension (Zero Proxy)</SelectItem>
                      <SelectItem value="none">None (Direct Request)</SelectItem>
                      <SelectItem value="corsproxy">CORSProxy</SelectItem>
                      <SelectItem value="custom">Custom CORS Proxy</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex flex-wrap items-center gap-1.5 px-0.5 mt-1 text-[11px] leading-tight">
                    {localSettings.corsProvider === 'extension' ? (
                      <>
                        <span className="text-muted-foreground">Need the helper extension?</span>
                        <button
                          type="button"
                          onClick={handleDownloadExtension}
                          className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium cursor-pointer"
                        >
                          Download Extension (.zip) <Download className="h-2.5 w-2.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-muted-foreground">Want custom hosting?</span>
                        <a
                          href="https://github.com/Noob31Gen/WorkersProxy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium"
                        >
                          Setup your own proxy <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {localSettings.corsProvider === 'extension' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">Extension Security Password</label>
                      {hasSavedPassword && (
                        <button
                          type="button"
                          onClick={() => {
                            setHasSavedPassword(false);
                            setPasswordInput('');
                            setLocalSettings({ ...localSettings, extensionPassword: '' });
                          }}
                          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        >
                          Clear password
                        </button>
                      )}
                    </div>
                    <Input
                      type="password"
                      placeholder={hasSavedPassword ? "•••••••• (Password configured)" : "Optional SHA-256 Auth Password"}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="h-9 text-sm bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground/80 leading-tight">
                      {hasSavedPassword 
                        ? "Password is saved and hidden. Type a new value to replace it." 
                        : "If configured in the extension popup, enter the matching password here."}
                    </p>
                  </div>
                )}

                {localSettings.corsProvider === 'custom' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Custom CORS URL</label>
                      <Input
                        placeholder="https://corsproxy.io/?"
                        value={localSettings.customCorsUrl}
                        onChange={(e) => setLocalSettings({ ...localSettings, customCorsUrl: e.target.value })}
                        className="h-9 text-sm bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Custom CORS Proxy Token</label>
                      <Input
                        type="password"
                        placeholder="Bearer Token (Optional)"
                        value={localSettings.customCorsToken || ''}
                        onChange={(e) => setLocalSettings({ ...localSettings, customCorsToken: e.target.value })}
                        className="h-9 text-sm bg-background"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Query Resolution Settings */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 px-0.5">Query Resolution Settings</h4>
            
            <div className="space-y-4 pl-0.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Resolution Mode</label>
                <Select
                  value={localSettings.serverMode || 'browser'}
                  onValueChange={(val: string) => {
                    const newMode = val as AppSettings['serverMode'];
                    if (newMode === 'custom') {
                      setLocalSettings({ ...localSettings, serverMode: 'custom', corsProvider: 'none' });
                    } else {
                      setLocalSettings({
                        ...localSettings,
                        serverMode: 'browser',
                        corsProvider: localSettings.corsProvider === 'none' ? 'auto' : localSettings.corsProvider
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-9 text-sm bg-background border-border/60 min-w-0 [&>span]:truncate">
                    <SelectValue placeholder="Select resolution mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser">Browser Direct (Local)</SelectItem>
                    <SelectItem value="custom">Custom API Server</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex flex-wrap items-center gap-1.5 px-0.5 mt-1 text-[11px] leading-tight">
                  <span className="text-muted-foreground">Want custom hosting?</span>
                  <a
                    href="https://github.com/Noob31Gen/noob31-multitool/tree/main/api-worker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium"
                  >
                    Deploy your own API worker <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>

              {localSettings.serverMode === 'custom' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Custom Server URL</label>
                    <Input
                      placeholder="https://api.yourdomain.com"
                      value={localSettings.customServerUrl || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, customServerUrl: e.target.value })}
                      className="h-9 text-sm bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Custom Server Token</label>
                    <Input
                      type="password"
                      placeholder="Bearer Token (Optional)"
                      value={localSettings.customServerToken || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, customServerToken: e.target.value })}
                      className="h-9 text-sm bg-background"
                    />
                  </div>
                </>
              )}
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