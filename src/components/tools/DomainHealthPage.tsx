import { useState, useEffect, useCallback, useRef } from "react"
import { logger } from "@/lib/logger"
import { useLocation } from "react-router-dom"
import { runDomainHealth } from "@/lib/health"
import type { DNSRecord } from "@/lib/doh"
import { useSettings } from "@/lib/settings"
import { SEO } from "@/components/shared/SEO"
import { ResultCard } from "@/components/shared/ResultCard"
import { CopyButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, AlertTriangle, CheckCircle, HelpCircle, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HealthItem } from "@/components/shared/HealthReportCard"
import { DNSResultTable } from "@/components/shared/DNSResultTable"
export function DomainHealthPage() {
  const { settings } = useSettings()
  const location = useLocation();
  const [domain, setDomain] = useState("")
  const [selector, setSelector] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<{ recommendations: { level: string; msg: string }[]; dnsResults: ({ type: string; success: boolean; data?: { records: DNSRecord[] }; error?: string })[]; emailResults: ({ type: string; success: boolean; records: DNSRecord[]; allRecords: DNSRecord[]; error?: string })[]; grade: string; score: number; queryTime: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-500 border-green-500/20 bg-green-500/10'
      case 'B': return 'text-green-400 border-green-400/20 bg-green-400/10'
      case 'C': return 'text-amber-500 border-amber-500/20 bg-amber-500/10'
      case 'D': return 'text-orange-500 border-orange-500/20 bg-orange-500/10'
      default: return 'text-destructive border-destructive/20 bg-destructive/10'
    }
  }

  const getGradeTextClass = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-500'
      case 'B': return 'text-green-400'
      case 'C': return 'text-amber-500'
      case 'D': return 'text-orange-500'
      default: return 'text-destructive'
    }
  }
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

  const lastHandledTarget = useRef<string | null>(null);
  useEffect(() => {
    const q = (location.state as { target?: string })?.target;
    if (q && q !== lastHandledTarget.current) {
      lastHandledTarget.current = q;
      setDomain(q);
      performSearch(q);
    }
  }, [location, performSearch]);
  const handleSearch = (e: React.FormEvent) => {
    if (e) e.preventDefault()
    performSearch(domain)
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
        <ResultCard title="Analysis Failed" status="error" description={errorMsg}>
          <div className="text-sm text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">
            Ensure the domain is correct.
          </div>
        </ResultCard>
      )}
      {status === 'success' && result && (
        <div className="space-y-6">
          {/* Quick Info Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-3 border-border/80 flex flex-col justify-center shadow-sm">
              <CardContent className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Target Domain
                    </span>
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 font-mono">
                      Domain Health Check
                    </Badge>
                  </div>
                  <h2 className="text-xl font-bold font-mono text-foreground break-all">{domain}</h2>
                </div>
                
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Health Score Metric */}
                  <div className="p-3 border border-border/60 bg-muted/10 rounded-lg text-center min-w-[120px]">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                      Health Score
                    </span>
                    <span className={`text-2xl font-black ${getGradeTextClass(result.grade)}`}>
                      {result.score} <span className="text-xs text-muted-foreground font-normal">/100</span>
                    </span>
                  </div>

                  {/* Overall Grade Badge */}
                  <div className={`p-3 border rounded-lg text-center min-w-[130px] ${getGradeColor(result.grade)}`}>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                      Overall Grade
                    </span>
                    <span className="text-xl font-black">{result.grade}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-muted/10 flex flex-col justify-between h-full shadow-sm">
              <CardContent className="py-6 text-center flex flex-col justify-between h-full">
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground block">Query Time</span>
                  <span className="text-2xl font-black text-primary font-mono">{result.queryTime} ms</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-center mt-3">
                  <CopyButton data={JSON.stringify(result, null, 2)} text="Copy Full Report JSON" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Core Results Cascade */}
          <div className="space-y-6">
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
        </div>
      )}
    </div>
  )
}