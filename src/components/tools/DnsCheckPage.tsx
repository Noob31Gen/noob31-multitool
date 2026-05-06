import { useState, useEffect, useCallback, useRef } from "react"
import { logger } from "@/lib/logger"
import { useLocation } from "react-router-dom"
import { runDnsCheck } from "@/lib/health"
import type { DNSRecord } from "@/lib/doh"
import { useSettings } from "@/lib/settings"
import { SEO } from "@/components/shared/SEO"
import { ResultCard } from "@/components/shared/ResultCard"
import { CopyButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { HealthItem } from "@/components/shared/HealthReportCard"
import { DNSResultTable } from "@/components/shared/DNSResultTable"
export function DnsCheckPage() {
  const { settings } = useSettings()
  const location = useLocation()
  const [domain, setDomain] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<{ results: ({ type: string; success: boolean; data?: { records: DNSRecord[] }; error?: string })[]; queryTime: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const performSearch = useCallback(async (targetDomain: string) => {
    if (!targetDomain.trim()) return
    setStatus('loading')
    setErrorMsg("")
    setResult(null)
    const startTime = performance.now();
    try {
      const res = await runDnsCheck(targetDomain, settings);
      const queryTime = Math.round(performance.now() - startTime);
      setResult({ results: res, queryTime });
      setStatus('success')
    } catch (err: unknown) {
      logger.error(err)
      const message = err instanceof Error ? err.message : "An error occurred during the DNS check.";
      setErrorMsg(message)
      setStatus('error')
    }
  }, [settings]);

  const lastHandledTarget = useRef<string | null>(null);
  useEffect(() => {
    const target = (location.state as { target?: string })?.target;
    if (target && target !== lastHandledTarget.current) {
      lastHandledTarget.current = target;
      setDomain(target);
      performSearch(target);
    }
  }, [location, performSearch]);
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    performSearch(domain)
  }
  return (
    <div className="space-y-6">
      <SEO 
        title="Comprehensive DNS Check"
        description="Run a parallel query for all core DNS records (A, AAAA, MX, TXT, NS, SOA) to audit a domain's DNS health."
        url="https://tools.noob31.com/health/dns"
      />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">DNS Check</h1>
        <p className="text-muted-foreground mt-2">Runs a parallel query for all core DNS records associated with a domain.</p>
      </div>
      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="example.com"
              className="pl-9 bg-background"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={status === 'loading'} className="w-full sm:w-auto">
            {status === 'loading' ? 'Checking...' : `Check DNS`}
          </Button>
        </form>
      </Card>
      {status === 'loading' && (
        <ResultCard title="Querying 7 DNS record types concurrently..." status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}
      {status === 'error' && (
        <ResultCard title="Analysis Failed" status="error" description={errorMsg}>
          <div className="text-sm text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">
            Ensure the domain is correct.
          </div>
        </ResultCard>
      )}
      {status === 'success' && result && (
        <ResultCard
          title="Consolidated DNS Health"
          status="success"
          timeMs={result.queryTime}
          action={<CopyButton data={JSON.stringify(result.results, null, 2)} text="Copy JSON" />}
        >
          <div className="space-y-2">
            {result.results.map((r: { type: string; success: boolean; data?: { records: DNSRecord[] }; error?: string }) => {
              const count = r.data?.records?.length || 0;
              const pass = count > 0;
              return (
                <HealthItem
                  key={r.type}
                  title={`${r.type} Records`}
                  status={pass ? 'pass' : (['SOA', 'NS'].includes(r.type) ? 'fail' : 'warn')}
                  message={pass ? `Found ${count} records` : `No records found`}
                  details={pass ? <DNSResultTable records={r.data!.records} /> : null}
                />
              )
            })}
          </div>
        </ResultCard>
      )}
    </div>
  )
}