import { useState, useEffect, useCallback, useRef } from "react"
import { logger } from "@/lib/logger"
import { useLocation } from "react-router-dom"
import { checkBlacklist } from "@/lib/blacklist"
import { useSettings } from "@/lib/settings"
import { SEO } from "@/components/shared/SEO"
import { ResultCard } from "@/components/shared/ResultCard"
import { ErrorDisplay } from "@/components/shared/ErrorDisplay"
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"

interface BlacklistResultItem {
  zone: string;
  listed: boolean;
  records: string[];
  details: string | null;
  classification: string | null;
  error: boolean;
}

interface BlacklistResult {
  data: BlacklistResultItem[];
  queryTime: number;
}
export function BlacklistPage() {
  const { settings } = useSettings()
  const location = useLocation()
  const [ip, setIp] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<BlacklistResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const performSearch = useCallback(async (targetIp: string) => {
    if (!targetIp.trim()) return
    setStatus('loading')
    setErrorMsg("")
    setResult(null)
    const startTime = performance.now();
    try {
      const res = await checkBlacklist(targetIp, settings);
      const queryTime = Math.round(performance.now() - startTime);
      setResult({ data: res, queryTime });
      setStatus('success')
    } catch (err: unknown) {
      logger.error(err)
      const message = err instanceof Error ? err.message : "An error occurred during blacklist check.";
      setErrorMsg(message)
      setStatus('error')
    }
  }, [settings]);

  const lastHandledTarget = useRef<string | null>(null);
  useEffect(() => {
    const target = (location.state as { target?: string })?.target;
    if (target && target !== lastHandledTarget.current) {
      lastHandledTarget.current = target;
      setIp(target);
      performSearch(target);
    }
  }, [location, performSearch]);
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    performSearch(ip)
  }
  const listedCount = result?.data?.filter((r: BlacklistResultItem) => r.listed).length || 0;
  const totalCount = result?.data?.length || 0;
  return (
    <div className="space-y-6">
      <SEO
        title="IPv4 Blacklist Check"
        description="Check if an IP address is listed on major DNSBL (Blackhole) lists. Important for email deliverability and security."
        url="https://tools.noob31.com/security/blacklist"
      />
      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">Blacklist Check</h1>
        <p className="text-muted-foreground mt-2">Checks an IPv4 address against major DNS-based Blackhole Lists (DNSBLs).</p>
      </div>
      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
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
        <ErrorDisplay
          title="Lookup Failed"
          error={errorMsg}
          suggestion="Please enter a valid IPv4 address."
          onRetry={handleSearch}
        />
      )}
      {status === 'success' && result && (
        <ResultCard
          title={`Checked ${totalCount} Blacklists`}
          status="success"
          timeMs={result.queryTime}
          action={
            <div className="flex flex-wrap gap-2 items-center">
              <Button onClick={() => window.open(`https://check.spamhaus.org/results/?query=${encodeURIComponent(ip)}`, '_blank', 'noopener,noreferrer')}>Check on Spamhaus</Button>
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
            {result.data.map((item: BlacklistResultItem, i: number) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${item.listed
                  ? 'bg-destructive/5 border-destructive/30 md:col-span-full'
                  : 'bg-card items-center'
                  }`}
              >
                <div className={`${item.listed ? 'mt-0.5' : ''} shrink-0`}>
                  {item.error ? (
                    <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  ) : item.listed ? (
                    <XCircle className="w-5 h-5 text-destructive" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div className="min-w-0 w-full flex flex-col gap-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p className="text-sm font-medium truncate" title={item.zone}>{item.zone}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.error ? 'Query failed' : item.listed ? 'Listed' : 'Clean'}
                      {item.listed && item.records?.[0] && !item.classification ? ` (${item.records[0]})` : ''}
                    </p>
                  </div>
                  {item.classification && (
                    <div className="w-fit">
                      <span className="text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded px-2 py-0.5 inline-block">
                        {item.classification}
                      </span>
                    </div>
                  )}
                  {item.details && (
                    <div className="text-xs font-mono text-muted-foreground break-words whitespace-pre-wrap bg-background/50 p-2.5 rounded border border-border/50 mt-1">
                      {item.details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ResultCard>
      )}
    </div>
  )
}