import { useState } from "react"
import { runDomainHealth } from "@/lib/health"
import { useSettings } from "@/lib/settings"
import { ResultCard } from "@/components/shared/ResultCard"
import { CopyButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { HealthItem } from "@/components/shared/HealthReportCard"
import { DNSResultTable } from "@/components/shared/DNSResultTable"

export function DomainHealthPage() {
  const { settings } = useSettings()
  const [domain, setDomain] = useState("")
  const [selector, setSelector] = useState("default")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!domain.trim()) return

    setStatus('loading')
    setErrorMsg("")
    setResult(null)

    const startTime = performance.now();

    try {
      const res = await runDomainHealth(domain, selector, settings);
      const queryTime = Math.round(performance.now() - startTime);
      setResult({ ...res, queryTime });
      setStatus('success')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "An error occurred during the health check.")
      setStatus('error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Domain Health Check</h1>
        <p className="text-muted-foreground mt-2">Aggregates DNS and Email Auth records to compute a health grade.</p>
      </div>

      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="DKIM/BIMI Selector (e.g. default)"
            className="w-full sm:w-[220px] bg-background"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
          />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
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
        <div className="grid gap-6 md:grid-cols-[1fr_300px] items-start">
          <div className="space-y-6">
             <ResultCard title="Core DNS Health" status="success">
                {result.dnsResults.map((r: any) => {
                   const count = r.data?.records?.length || 0;
                   const pass = count > 0;
                   return (
                     <HealthItem 
                        key={r.type}
                        title={`${r.type} Records`}
                        status={pass ? 'pass' : (['SOA', 'NS'].includes(r.type) ? 'fail' : 'warn')}
                        message={pass ? `Found ${count} records` : `No records found`}
                        details={pass ? <DNSResultTable records={r.data.records} /> : null}
                     />
                   )
                })}
             </ResultCard>
             <ResultCard title="Email Authentication" status="success">
                {result.emailResults.map((r: any) => {
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
          <div className="sticky top-20">
            <Card className="p-6 flex flex-col items-center justify-center text-center">
              <h3 className="font-semibold text-lg text-muted-foreground mb-4">Overall Grade</h3>
              <div className={`text-8xl font-black mb-4 
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
