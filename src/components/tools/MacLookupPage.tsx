import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { lookupMac, type MacLookupResponse, formatMac, isValidMac } from "@/lib/macLookup"
import { useSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"
import { ResultCard } from "@/components/shared/ResultCard"
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Info, ShieldCheck } from "lucide-react"
import { Card } from "@/components/ui/card"

export function MacLookupPage() {
  const { settings } = useSettings()
  const [input, setInput] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<MacLookupResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const location = useLocation();
  useEffect(() => {
    const q = location.state?.target;
    if (q) {
      setInput(q);
      performLookup(q);
    }
  }, [location.state]);

  const performLookup = async (macAddress: string) => {
    if (!macAddress.trim()) return

    setStatus('loading')
    setErrorMsg("")
    setResult(null)

    try {
      const res = await lookupMac(macAddress, settings.corsProvider, settings.customCorsUrl)
      if (res.success) {
        setResult(res)
        setStatus('success')
      } else {
        setErrorMsg(res.error || "Lookup failed")
        setStatus('error')
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during lookup.")
      setStatus('error')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    if (e) e.preventDefault()
    performLookup(input)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">MAC / OUI Lookup</h1>
        <p className="text-muted-foreground mt-2">Identify device manufacturers and verify OUI registration status.</p>
      </div>

      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter MAC address or OUI (e.g. 00:00:5E:00:53:AF)"
              className="pl-9 bg-background"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={status === 'loading'} className="w-full sm:w-auto">
            {status === 'loading' ? 'Searching...' : 'Lookup'}
          </Button>
        </form>
      </Card>

      {status === 'loading' && (
        <ResultCard title="Searching Database..." status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}

      {status === 'error' && (
        <ResultCard title="Lookup Failed" status="error" description={errorMsg}>
          <div className="text-sm text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">
            Please verify the MAC address format and try again.
          </div>
        </ResultCard>
      )}

      {status === 'success' && result && (
        <ResultCard
          title="Vendor Identification"
          status="success"
          timeMs={result.queryTime}
          description={`Data retrieved for ${result.oui}`}
          action={
            <div className="flex gap-2">
              <CopyButton data={JSON.stringify(result, null, 2)} text="Copy JSON" />
              <ExportButton data={result} filename={`mac-lookup-${result.oui}.json`} />
            </div>
          }
        >
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column: Vendor Info */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">Manufacturer / Vendor</h3>
                <p className="text-3xl font-bold text-primary break-words">{result.vendor}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">OUI Prefix</h3>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-muted rounded text-lg font-mono font-bold">{result.oui.match(/.{1,2}/g)?.join(':')}</code>
                    <span className="text-xs text-muted-foreground">(First 24 bits)</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">Clean Format</h3>
                  <code className="px-2 py-1 bg-muted rounded text-lg font-mono">{formatMac(result.mac)}</code>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {result.country && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">Country</h3>
                    <p className="font-medium">{result.country}</p>
                  </div>
                )}
                {result.blockType && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">Block Type</h3>
                    <p className="font-medium">{result.blockType}</p>
                  </div>
                )}
                {result.category && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">Likely Device Category</h3>
                    <p className="font-medium text-primary">{result.category}</p>
                  </div>
                )}
              </div>

              {result.address && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">Company Address</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.address}</p>
                </div>
              )}

              {result.range && (
                <div className="p-3 bg-muted/30 rounded border border-dashed">
                  <h3 className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-tight">Assigned Address Range</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 font-mono text-xs">
                    <span className="text-muted-foreground">Start:</span>
                    <span className="bg-background px-1.5 py-0.5 rounded border">{result.range.start}</span>
                    <span className="hidden sm:inline text-muted-foreground">→</span>
                    <span className="text-muted-foreground">End:</span>
                    <span className="bg-background px-1.5 py-0.5 rounded border">{result.range.end}</span>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">Bit Analysis (First Octet)</h3>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-1 font-mono text-xl">
                    {result.binary.split('').map((bit, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-8 h-10 flex items-center justify-center border rounded transition-colors",
                          i === 7 ? (result.isUnicast ? "bg-green-500/10 border-green-500/50 text-green-600" : "bg-orange-500/10 border-orange-500/50 text-orange-600") :
                          i === 6 ? (result.isUniversal ? "bg-blue-500/10 border-blue-500/50 text-blue-600" : "bg-purple-500/10 border-purple-500/50 text-purple-600") :
                          "bg-muted border-transparent"
                        )}
                        title={i === 7 ? "I/G Bit" : i === 6 ? "U/L Bit" : `Bit ${7-i}`}
                      >
                        {bit}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className={cn(
                     "p-3 rounded-lg border",
                     result.isUnicast ? "bg-green-500/5 border-green-500/20" : "bg-orange-500/5 border-orange-500/20"
                   )}>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Transmission Type</p>
                      <p className="font-semibold">{result.isUnicast ? "Unicast (Individual)" : "Multicast (Group)"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.isUnicast 
                          ? "Addresses a single network interface." 
                          : "Addresses multiple network interfaces."}
                      </p>
                   </div>

                   <div className={cn(
                     "p-3 rounded-lg border",
                     result.isUniversal ? "bg-blue-500/5 border-blue-500/20" : "bg-purple-500/5 border-purple-500/20"
                   )}>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Administration Type</p>
                      <p className="font-semibold">{result.isUniversal ? "Universal (UAA)" : "Locally Administered (LAA)"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.isUniversal 
                          ? "Assigned by the manufacturer globally." 
                          : "Assigned by a network administrator."}
                      </p>
                   </div>
                </div>
              </div>
            </div>

            {/* Right Column: Knowledge / Help */}
            <div className="space-y-4">
               <Card className="p-4 border-dashed bg-muted/20">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Structure</p>
                      <p className="text-muted-foreground leading-relaxed">
                        A MAC address consists of 48 bits (6 bytes). The first 3 bytes are the <strong>OUI</strong>, and the last 3 bytes are assigned by the manufacturer to the specific device.
                      </p>
                    </div>
                  </div>
               </Card>

               <Card className="p-4 border-dashed bg-muted/20">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Address Format</p>
                      <p className="text-muted-foreground leading-relaxed">
                        {isValidMac(result.mac) ? 
                          (formatMac(result.mac).length === 12 ? "Full 48-bit MAC Address detected." : "24-bit OUI Prefix detected.") 
                          : "Custom identifier format."}
                      </p>
                    </div>
                  </div>
               </Card>

               <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <h4 className="text-xs font-bold uppercase mb-2 text-primary">Quick Tip</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If the second character of a MAC address is 2, 6, A, or E, it is likely a <strong>locally administered</strong> (randomized) address, common in modern smartphones for privacy.
                  </p>
               </div>
            </div>
          </div>
        </ResultCard>
      )}
    </div>
  )
}
