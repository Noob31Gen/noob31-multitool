import { useState, useEffect } from "react"
import { queryASN } from "@/lib/asn"
import { useSettings } from "@/lib/settings"
import { ResultCard } from "@/components/shared/ResultCard"
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { MapPin, Network, Globe } from "lucide-react"

export function MyIpPage() {
  const { settings } = useSettings()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [result, setResult] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    let isMounted = true;
    async function fetchMyIp() {
      try {
        const res = await queryASN("", settings);
        if (isMounted) {
          setResult(res);
          setStatus('success');
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || "Failed to fetch IP address.");
          setStatus('error');
        }
      }
    }
    fetchMyIp();
    return () => { isMounted = false; };
  }, [settings.apiKeys.ipinfo]); // re-run if token changes

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">What Is My IP?</h1>
        <p className="text-muted-foreground mt-2">Check your public IP address and network information.</p>
      </div>

      {status === 'loading' && (
        <ResultCard title="Detecting your IP..." status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}

      {status === 'error' && (
        <ResultCard title="Lookup Failed" status="error" description={errorMsg}>
          <div className="text-sm text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">
            Ensure you are connected to the internet. If you have an adblocker, it may block ipinfo.io.
          </div>
        </ResultCard>
      )}

      {status === 'success' && result && (
        <div className="grid gap-6 md:grid-cols-2">
          <ResultCard 
            title="Your Public IP" 
            status="success" 
            action={<CopyButton data={result.ip} text="Copy IP" />}
          >
            <div className="text-4xl font-mono font-bold text-center py-8 text-primary break-all">
              {result.ip}
            </div>
          </ResultCard>

          <ResultCard 
            title="Network Details" 
            action={<ExportButton data={result} filename={`my-ip-${result.ip}.json`} />}
          >
            <div className="space-y-6 pt-2">
              <div className="flex items-center gap-3">
                <Network className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">ISP / Organization</p>
                  <p className="text-sm text-muted-foreground">{result.org || 'Unknown'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">
                    {[result.city, result.region, result.country].filter(Boolean).join(', ') || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Hostname</p>
                  <p className="text-sm text-muted-foreground break-all">{result.hostname || 'None'}</p>
                </div>
              </div>
            </div>
          </ResultCard>
        </div>
      )}
    </div>
  )
}
