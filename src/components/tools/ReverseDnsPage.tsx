import { useState, useEffect, useCallback, useRef } from "react"
import { useLocation } from "react-router-dom"
import { lookupReverseDns, type ReverseDnsResult } from "@/lib/reverseDns"
import { useSettings } from "@/lib/settings"
import { SEO } from "@/components/shared/SEO"
import { ResultCard } from "@/components/shared/ResultCard"
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Globe, Network, MapPin, AlertTriangle, CheckCircle } from "lucide-react"

export function ReverseDnsPage() {
  const { settings } = useSettings()
  const location = useLocation()
  const [inputIp, setInputIp] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<ReverseDnsResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const performSearch = useCallback(async (targetIp: string) => {
    if (!targetIp.trim()) return
    setStatus('loading')
    setErrorMsg("")
    setResult(null)
    try {
      const res = await lookupReverseDns(targetIp.trim(), settings)
      setResult(res)
      setStatus('success')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during reverse DNS lookup.";
      setErrorMsg(message)
      setStatus('error')
    }
  }, [settings])

  const lastHandledTarget = useRef<string | null>(null)
  useEffect(() => {
    const target = (location.state as { target?: string })?.target
    if (target && target !== lastHandledTarget.current) {
      lastHandledTarget.current = target
      setInputIp(target)
      performSearch(target)
    }
  }, [location, performSearch])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(inputIp)
  }

  return (
    <div className="space-y-6">
      <SEO
        title="Reverse DNS Lookup"
        description="Perform reverse DNS pointer (PTR) lookups for IPv4 and IPv6 addresses. Look up hostnames and identify netblock ownership."
        url="https://tools.noob31.com/network/reverse-dns"
      />
      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">Reverse DNS Lookup</h1>
        <p className="text-muted-foreground mt-2">
          Resolve IPv4 and IPv6 addresses back to their associated hostname pointers (PTR records).
        </p>
      </div>

      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter IP Address (e.g. 8.8.8.8 or 2001:4860:4860::8888)"
              className="pl-9 bg-background"
              value={inputIp}
              onChange={(e) => setInputIp(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={status === 'loading'} className="w-full sm:w-auto">
            {status === 'loading' ? 'Resolving...' : 'Reverse Lookup'}
          </Button>
        </form>
      </Card>

      {status === 'loading' && (
        <ResultCard title="Querying Reverse Pointer Records..." status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}

      {status === 'error' && (
        <ResultCard title="Lookup Failed" status="error" description={errorMsg}>
          <div className="text-sm text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">
            Please verify the IP format and try again.
          </div>
        </ResultCard>
      )}

      {status === 'success' && result && (
        <div className="space-y-6">
          <ResultCard
            title={`Reverse DNS Result for ${result.ip}`}
            status="success"
            timeMs={result.queryTime}
            description={`Queried via ${result.provider} DoH`}
            action={
              <div className="flex gap-2">
                <CopyButton data={JSON.stringify(result, null, 2)} text="Copy JSON" />
                <ExportButton data={result} filename={`${result.ip}-reverse-dns.json`} />
              </div>
            }
          >
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Resolved Hostname / PTR Records
                  </h3>
                  {result.hostnames.length > 0 ? (
                    <div className="space-y-2">
                      {result.hostnames.map((host, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 rounded-md border bg-card/50 font-mono text-sm break-all"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          <span>{host}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-md border border-amber-200 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <div className="text-sm font-medium">
                        No PTR records resolved for this IP address.
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Reverse Query Target</span>
                    <p className="text-sm font-mono break-all bg-muted/40 p-2 rounded mt-1 border">
                      {result.reverseDomain}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">IP Category</span>
                    <div className="mt-1">
                      <Badge variant={result.classification.includes("Public") ? "default" : "secondary"}>
                        {result.classification}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="p-4 space-y-4 bg-muted/20">
                <h4 className="text-xs font-bold uppercase text-muted-foreground border-b pb-2">
                  Network Association
                </h4>
                {result.asnDetails ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Network className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs font-bold uppercase text-muted-foreground">Operator / ISP</p>
                        <p className="text-sm font-semibold">{result.asnDetails.org || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 border-t pt-2">
                      <Globe className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs font-bold uppercase text-muted-foreground">Autonomous System</p>
                        <p className="text-sm font-mono">{result.asnDetails.asn || "N/A"}</p>
                      </div>
                    </div>
                    {result.asnDetails.country && (
                      <div className="flex items-start gap-2 border-t pt-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-xs font-bold uppercase text-muted-foreground">Region / Country</p>
                          <p className="text-sm">{result.asnDetails.country}</p>
                        </div>
                      </div>
                    )}
                    {result.asnDetails.rir && (
                      <div className="flex items-start gap-2 border-t pt-2">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 uppercase font-mono">
                          Registry: {result.asnDetails.rir}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Network details unavailable for local or private IP addresses.
                  </p>
                )}
              </Card>
            </div>
          </ResultCard>
        </div>
      )}
    </div>
  )
}
