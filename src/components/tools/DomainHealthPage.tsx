import { useState, useEffect, useCallback, useRef } from "react"
import { logger } from "@/lib/logger"
import { runDomainHealth } from "@/lib/health"
import type { DNSRecord } from "@/lib/doh"
import { useSettings } from "@/lib/settings"
import { SEO } from "@/components/shared/SEO"
import { ResultCard } from "@/components/shared/ResultCard"
import { ErrorDisplay } from "@/components/shared/ErrorDisplay"
import { CopyButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, AlertTriangle, CheckCircle, HelpCircle, XCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { HealthItem } from "@/components/shared/HealthReportCard"
import { DNSResultTable } from "@/components/shared/DNSResultTable"
import { useUrlQuery } from "@/lib/useUrlQuery"
import { JsonResultView } from "@/components/shared/JsonResultView"

export function DomainHealthPage() {
  const { settings } = useSettings()
  const [domain, setDomain] = useState("")
  const [selector, setSelector] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<{ recommendations: { level: string; msg: string }[]; dnsResults: ({ type: string; success: boolean; data?: { records: DNSRecord[] }; error?: string })[]; emailResults: ({ type: string; success: boolean; records: DNSRecord[]; allRecords: DNSRecord[]; error?: string })[]; grade: string; score: number; queryTime: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const performSearch = useCallback(async (targetDomain: string) => {
    if (!targetDomain.trim()) return
    setStatus('loading')
    setErrorMsg("")
    setResult(null)
    const startTime = performance.now();
    try {
      const res = await runDomainHealth(targetDomain, selector, settings);
      const queryTime = Math.round(performance.now() - startTime);
      setResult({ ...res, queryTime });
      setStatus('success')
    } catch (err: unknown) {
      logger.error(err)
      const message = err instanceof Error ? err.message : "An error occurred during the health check.";
      setErrorMsg(message)
      setStatus('error')
    }
  }, [selector, settings]);

  const { target: urlTarget, isJsonMode } = useUrlQuery()
  const lastHandledTarget = useRef<string | null>(null);
  useEffect(() => {
    if (urlTarget && urlTarget !== lastHandledTarget.current) {
      lastHandledTarget.current = urlTarget;
      setDomain(urlTarget);
      performSearch(urlTarget);
    }
  }, [urlTarget, performSearch]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    performSearch(domain)
  }

  if (isJsonMode) {
    return <JsonResultView status={status} data={result} error={errorMsg} query={domain || urlTarget} tool="Domain Health" />
  }
  return (
    <div className="space-y-6">
      <SEO
        title="Domain Health Check"
        description="Comprehensive analysis of DNS, SPF, DKIM, and DMARC records to compute a domain health grade and identify issues."
        url="https://tools.noob31.com/health/domain"
      />
      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">Domain Health Check</h1>
        <p className="text-muted-foreground mt-2">Aggregates DNS and Email Auth records to compute a health grade.</p>
      </div>
      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-[220px]">
            <Input
              placeholder="DKIM Selector (optional)"
              className="bg-background"
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
            />
          </div>
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
            {status === 'loading' ? 'Analyzing...' : `Analyze Domain`}
          </Button>
        </form>
      </Card>
      {status === 'loading' && (
        <ResultCard title="Running comprehensive analysis..." status="loading" description="Executing 13 concurrent DNS queries...">
          <LoadingSkeleton />
        </ResultCard>
      )}
      {status === 'error' && (
        <ErrorDisplay
          title="Analysis Failed"
          error={errorMsg}
          suggestion="Ensure the domain is correct."
          onRetry={handleSearch}
        />
      )}
      {status === 'success' && result && (
        <div className="grid gap-6 md:grid-cols-[1fr_300px] items-start">
          <div className="order-2 md:order-1 space-y-6">
            {result.recommendations && result.recommendations.length > 0 && (
              <ResultCard title="Actionable Insights" status="success">
                <div className="space-y-3">
                  {result.recommendations.map((rec: { level: string; msg: string }, idx: number) => {
                    const bgMap: Record<string, string> = {
                      critical: 'bg-destructive/10 border-destructive/20 text-destructive',
                      high: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
                      medium: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
                      low: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
                      good: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                    };
                    const IconMap: Record<string, React.ElementType> = {
                      critical: XCircle,
                      high: AlertTriangle,
                      medium: AlertTriangle,
                      low: HelpCircle,
                      good: CheckCircle
                    };
                    const level = String(rec.level);
                    const bg = bgMap[level] || bgMap.low;
                    const Icon = IconMap[level] || HelpCircle;
                    return (
                      <div key={idx} className={`flex items-start gap-3 p-3 rounded-md border ${bg}`}>
                        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                        <span className="text-sm font-medium">{rec.msg}</span>
                      </div>
                    );
                  })}
                </div>
              </ResultCard>
            )}
            <ResultCard title="Core DNS Health" status="success">
              {result.dnsResults.map((r: { type: string; success: boolean; data?: { records: DNSRecord[] }; error?: string }) => {
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
            </ResultCard>
            <ResultCard title="Email Authentication" status="success">
              {result.emailResults.map((r: { type: string; success: boolean; records: DNSRecord[]; allRecords: DNSRecord[]; error?: string }) => {
                const count = r.records?.length || 0;
                const pass = count > 0;
                const isCritical = ['SPF', 'DMARC'].includes(r.type);
                return (
                  <HealthItem
                    key={r.type}
                    title={`${r.type} Record`}
                    status={pass ? 'pass' : (isCritical ? 'fail' : 'info')}
                    message={pass ? `Found valid ${r.type}` : `Missing ${r.type} record`}
                    details={pass ? <DNSResultTable records={r.records} /> : null}
                  />
                )
              })}
            </ResultCard>
          </div>
          <div className="order-1 md:order-2 md:sticky md:top-20">
            <Card className="p-6 flex flex-col items-center justify-center text-center">
              <h3 className="font-semibold text-lg text-muted-foreground mb-4">Overall Grade</h3>
              <div className={`text-7xl sm:text-8xl font-black mb-4 
                ${result.grade === 'A' ? 'text-green-500' : ''}
                ${result.grade === 'B' ? 'text-green-400' : ''}
                ${result.grade === 'C' ? 'text-amber-500' : ''}
                ${result.grade === 'D' ? 'text-orange-500' : ''}
                ${result.grade === 'F' ? 'text-destructive' : ''}
              `}>
                {result.grade}
              </div>
              <div className="text-2xl font-bold mb-1">{result.score} / 100</div>
              <p className="text-sm text-muted-foreground mb-6">Computed in {result.queryTime}ms</p>
              <CopyButton data={JSON.stringify(result, null, 2)} text="Copy Full Report JSON" />
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}