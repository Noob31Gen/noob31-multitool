import { useState } from "react"
import { checkBlacklist } from "@/lib/blacklist"
import { useSettings } from "@/lib/settings"
import { ResultCard } from "@/components/shared/ResultCard"
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"

export function BlacklistPage() {
  const { settings } = useSettings()
  const [ip, setIp] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!ip.trim()) return

    setStatus('loading')
    setErrorMsg("")
    setResult(null)

    const startTime = performance.now();

    try {
      const res = await checkBlacklist(ip, settings);
      const queryTime = Math.round(performance.now() - startTime);
      setResult({ data: res, queryTime });
      setStatus('success')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "An error occurred during blacklist check.")
      setStatus('error')
    }
  }

  const listedCount = result?.data?.filter((r: any) => r.listed).length || 0;
  const totalCount = result?.data?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Blacklist Check</h1>
        <p className="text-muted-foreground mt-2">Checks an IPv4 address against major DNS-based Blackhole Lists (DNSBLs).</p>
      </div>

      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="IPv4 Address (e.g. 1.2.3.4)"
              className="pl-9 bg-background"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={status === 'loading'} className="w-full sm:w-auto">
            {status === 'loading' ? 'Checking...' : `Check IP`}
          </Button>
        </form>
      </Card>

      {status === 'loading' && (
        <ResultCard title="Querying DNSBLs in parallel..." status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}

      {status === 'error' && (
        <ResultCard title="Lookup Failed" status="error" description={errorMsg}>
           <div className="text-sm text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">
            Please enter a valid IPv4 address.
          </div>
        </ResultCard>
      )}

      {status === 'success' && result && (
        <ResultCard 
          title={`Checked ${totalCount} Blacklists`} 
          status="success" 
          timeMs={result.queryTime}
          action={
            <div className="flex gap-2">
              <CopyButton data={JSON.stringify(result.data, null, 2)} text="Copy JSON" />
              <ExportButton data={result.data} filename={`${ip}-blacklist.json`} />
            </div>
          }
        >
          
          <div className={`mb-6 p-4 rounded-md border text-center ${listedCount > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-green-500/10 border-green-500/30'}`}>
             <h3 className="text-xl font-bold mb-1">
                {listedCount > 0 ? `Listed on ${listedCount} / ${totalCount} blacklists` : 'Clean! Not listed on any checked blacklists.'}
             </h3>
             <p className="text-sm text-muted-foreground">
                {listedCount > 0 ? 'This IP address has reputation issues.' : 'This IP address has a good reputation.'}
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
             {result.data.map((item: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-md border ${item.listed ? 'bg-destructive/5 border-destructive/30' : 'bg-card'}`}>
                   {item.error ? (
                     <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                   ) : item.listed ? (
                     <XCircle className="w-5 h-5 text-destructive shrink-0" />
                   ) : (
                     <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                   )}
                   <div className="min-w-0">
                      <p className="text-sm font-medium truncate" title={item.zone}>{item.zone}</p>
                      <p className="text-xs text-muted-foreground truncate">
                         {item.error ? 'Query failed' : item.listed ? 'Listed' : 'Clean'}
                         {item.listed && item.records?.[0]?.data ? ` (${item.records[0].data})` : ''}
                      </p>
                   </div>
                </div>
             ))}
          </div>

        </ResultCard>
      )}
    </div>
  )
}
