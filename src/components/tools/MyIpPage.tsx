import { useState, useEffect, useCallback, useRef } from "react"
import { queryASN, type ASNResult } from "@/lib/asn"
import { useSettings } from "@/lib/settings"
import { SEO } from "@/components/shared/SEO"
import { ResultCard } from "@/components/shared/ResultCard"
import { ErrorDisplay } from "@/components/shared/ErrorDisplay"
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { MapPin, Network, Globe, ShieldAlert, Server, Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useUrlQuery } from "@/lib/useUrlQuery"
import { JsonResultView } from "@/components/shared/JsonResultView"

export function MyIpPage() {
  const { settings } = useSettings()
  const { target: urlTarget, isJsonMode } = useUrlQuery()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [result, setResult] = useState<ASNResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const fetchMyIp = useCallback(async (targetIp: string, isMounted: boolean) => {
    setStatus('loading');
    try {
      const res = await queryASN(targetIp, settings);
      if (isMounted) {
        setResult(res);
        setStatus('success');
      }
    } catch (err: unknown) {
      if (isMounted) {
        const message = err instanceof Error ? err.message : "Failed to fetch network information.";
        setErrorMsg(message);
        setStatus('error');
      }
    }
  }, [settings]);

  const fetchedTarget = useRef<string | null>(null);
  useEffect(() => {
    let isMounted = true;
    if (fetchedTarget.current !== urlTarget) {
      fetchedTarget.current = urlTarget;
      fetchMyIp(urlTarget, isMounted);
    }
    return () => { isMounted = false; };
  }, [urlTarget, fetchMyIp]);

  const parsed = result?.parsed;
  const currentIp = (result?.ipapi as { ip?: string })?.ip || "Unknown IP";

  if (isJsonMode) {
    return <JsonResultView status={status} data={result} error={errorMsg} query={urlTarget || currentIp} tool="My IP" />
  }
  return (
    <div className="space-y-6">
      <SEO
        title="What Is My IP Address?"
        description="Quickly find your public IPv4 address and view detailed network metadata including ISP, ASN, location, and security flags (VPN/Proxy detection)."
        url="https://tools.noob31.com/network/my-ip"
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">What Is My IP?</h1>
          <p className="text-muted-foreground mt-2">Detailed network forensics for your current connection.</p>
        </div>
        {status === 'success' && result && (
          <Badge variant="outline" className="font-mono text-[10px] uppercase">
            Data via {result.ipapi ? 'ipapi.is' : 'Fallback'}
          </Badge>
        )}
      </div>
      {status === 'loading' && (
        <ResultCard title="Detecting your connection..." status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}
      {status === 'error' && (
        <ErrorDisplay
          title="Lookup Failed"
          error={errorMsg}
          suggestion={
            errorMsg.toLowerCase().includes("cors")
              ? "CORS policy blocked the request. Try setting a CORS Proxy in Settings."
              : "Ensure you are connected to the internet. Adblockers may also interfere with network API requests."
          }
          onRetry={() => fetchMyIp(urlTarget, true)}
        />
      )}
      {status === 'success' && parsed && (
        <div className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 p-6 flex flex-col justify-center items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Globe className="w-32 h-32" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Public IPv4 Address</p>
              <div className="text-3xl sm:text-5xl font-mono font-bold text-primary break-all mb-4">
                {currentIp}
              </div>
              <div className="flex gap-2">
                <CopyButton data={currentIp} text="Copy" />
                <ExportButton data={result} filename={`my-ip-metadata.json`} />
              </div>
            </Card>
            <Card className="p-6 space-y-4">
              <h4 className="text-sm font-bold uppercase text-muted-foreground">Security Identity</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm flex items-center gap-2"><Server className="w-4 h-4" /> Datacenter</span>
                  <Badge variant={parsed.is_datacenter ? "destructive" : "secondary"}>
                    {parsed.is_datacenter ? "YES" : "NO"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> VPN/Proxy</span>
                  <Badge variant={parsed.is_vpn || parsed.is_proxy || parsed.is_tor ? "destructive" : "secondary"}>
                    {parsed.is_vpn || parsed.is_proxy || parsed.is_tor ? "DETECTED" : "CLEAN"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> Abuser Score</span>
                  <span className={`text-xs font-bold ${parsed.is_abuser ? 'text-destructive' : 'text-green-600'}`}>
                    {parsed.abuser_score || "0.00 (Low)"}
                  </span>
                </div>
              </div>
            </Card>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <ResultCard title="Network Authority">
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <Network className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-bold">{parsed.org || 'Unknown Provider'}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {parsed.asn || 'No ASN'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Registry</p>
                    <p className="text-sm">{parsed.rir || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Network Type</p>
                    <p className="text-sm capitalize">{parsed.type || 'Consumer'}</p>
                  </div>
                </div>
              </div>
            </ResultCard>
            <ResultCard title="Geographic Origin">
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-bold">
                      {[parsed.city, parsed.state].filter(Boolean).join(', ') || 'Unknown Region'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {parsed.country || 'Unknown Country'} {parsed.country_code ? `(${parsed.country_code})` : ''}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Coordinates</p>
                    <p className="text-sm font-mono text-xs">
                      {parsed.lat && parsed.lon ? `${parsed.lat}, ${parsed.lon}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Timezone</p>
                    <p className="text-sm">{parsed.timezone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </ResultCard>
          </div>
        </div>
      )}
    </div>
  )
}