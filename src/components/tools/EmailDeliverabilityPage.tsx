import { useState, useEffect, useCallback, useRef } from "react"
import { logger } from "@/lib/logger"
import { useLocation } from "react-router-dom"
import { runDeliverabilityCheck } from "@/lib/deliverability"
import type { DNSRecord } from "@/lib/doh"
import { useSettings } from "@/lib/settings"
import { SEO } from "@/components/shared/SEO"
import { ResultCard } from "@/components/shared/ResultCard"
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, AlertTriangle, XCircle, CheckCircle, Info } from "lucide-react"
import { Card } from "@/components/ui/card"
import { HealthItem } from "@/components/shared/HealthReportCard"
import { DNSResultTable } from "@/components/shared/DNSResultTable"
export function EmailDeliverabilityPage() {
  const { settings } = useSettings()
  const location = useLocation();
  const [domain, setDomain] = useState("")
  const [selector, setSelector] = useState("default")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<{ recommendations: { level: string; msg: string }[]; results: { type: string; records?: unknown[] }[]; grade: string; score: number; queryTime: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const performSearch = useCallback(async (targetDomain: string) => {
    if (!targetDomain.trim()) return
    setStatus('loading')
    setErrorMsg("")
    setResult(null)
    const startTime = performance.now();
    try {
      const res = await runDeliverabilityCheck(targetDomain, selector, settings);
      const queryTime = Math.round(performance.now() - startTime);
      setResult({ ...res, queryTime });
      setStatus('success')
    } catch (err: unknown) {
      logger.error(err)
      const message = err instanceof Error ? err.message : "An error occurred during deliverability check.";
      setErrorMsg(message)
      setStatus('error')
    }
  }, [selector, settings]);

  const lastHandledTarget = useRef<string | null>(null);
  useEffect(() => {
    const q = location.state?.target;
    if (q && q !== lastHandledTarget.current) {
      lastHandledTarget.current = q;
      setDomain(q);
      performSearch(q);
    }
  }, [location.state, performSearch]);
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    performSearch(domain)
  }
  return (
    <div className="space-y-6">
      <SEO 
        title="Email Deliverability Check"
        description="Check DNS-based email authentication (MX, SPF, DKIM, DMARC) and compute a deliverability score to improve inbox placement."
        url="https://tools.noob31.com/health/deliverability"
      />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Email Deliverability</h1>
        <p className="text-muted-foreground mt-2">Checks all DNS-based email authentication records and computes a deliverability score.</p>
      </div>
      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="DKIM Selector (default)"
            className="w-full sm:w-[180px] bg-background"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
          />
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
            {status === 'loading' ? 'Analyzing...' : `Analyze Setup`}
          </Button>
        </form>
      </Card>
      {status === 'loading' && (
        <ResultCard title="Analyzing email authentication setup..." status="loading">
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
        <div className="grid gap-6 md:grid-cols-[1fr_350px] items-start">
          <div className="order-2 md:order-1 space-y-6 min-w-0">
            <ResultCard title="Recommendations & Issues" status="success">
              <div className="space-y-3">
                {result.recommendations.map((rec: { level: string; msg: string }, i: number) => {
                  let icon = <Info className="w-5 h-5 text-blue-500" />;
                  let bgClass = "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-900/50";
                  if (rec.level === 'critical') {
                    icon = <XCircle className="w-5 h-5 text-destructive" />;
                    bgClass = "bg-destructive/10 border-destructive/30";
                  } else if (rec.level === 'high') {
                    icon = <AlertTriangle className="w-5 h-5 text-orange-500" />;
                    bgClass = "bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-900/50";
                  } else if (rec.level === 'medium') {
                    icon = <AlertTriangle className="w-5 h-5 text-amber-500" />;
                    bgClass = "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/50";
                  } else if (rec.level === 'good') {
                    icon = <CheckCircle className="w-5 h-5 text-green-500" />;
                    bgClass = "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/50";
                  }
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-md border ${bgClass}`}>
                      <div className="mt-0.5 shrink-0">{icon}</div>
                      <div className="text-sm">{rec.msg}</div>
                    </div>
                  )
                })}
              </div>
            </ResultCard>
            <ResultCard title="Authentication Records" status="success">
              {result.results.map((r: { type: string; records?: unknown[] }) => {
                const count = r.records?.length || 0;
                const pass = count > 0;
                const isCritical = ['MX', 'SPF', 'DMARC'].includes(r.type);
                return (
                  <HealthItem
                    key={r.type}
                    title={`${r.type} Record`}
                    status={pass ? 'pass' : (isCritical ? 'fail' : 'info')}
                    message={pass ? `Found valid ${r.type}` : `Missing ${r.type} record`}
                    details={pass ? <DNSResultTable records={r.records as DNSRecord[]} /> : null}
                  />
                )
              })}
            </ResultCard>
          </div>
          <div className="order-1 md:order-2 md:sticky md:top-20">
            <Card className="p-6 flex flex-col items-center justify-center text-center">
              <h3 className="font-semibold text-lg text-muted-foreground mb-4">Deliverability Grade</h3>
              <div className={`text-7xl sm:text-8xl font-black mb-4 
                ${result.grade.includes('A') ? 'text-green-500' : ''}
                ${result.grade === 'B' ? 'text-green-400' : ''}
                ${result.grade === 'C' ? 'text-amber-500' : ''}
                ${result.grade === 'D' ? 'text-orange-500' : ''}
                ${result.grade === 'F' ? 'text-destructive' : ''}
              `}>
                {result.grade}
              </div>
              <div className="text-2xl font-bold mb-1">{result.score} / 100</div>
              <p className="text-sm text-muted-foreground mb-6">Computed in {result.queryTime}ms</p>
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border mb-6 text-left">
                <strong>Disclaimer:</strong> This checks DNS-based email authentication only. SMTP connectivity testing requires a server-side tool.
              </div>
              <div className="flex gap-2 w-full justify-center flex-wrap">
                <CopyButton data={JSON.stringify(result, null, 2)} text="JSON" />
                <ExportButton data={result} filename={`${domain}-deliverability.json`} />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}