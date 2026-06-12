import { useState, useEffect, useCallback, useRef } from "react"
import { logger } from "@/lib/logger"
import { useLocation } from "react-router-dom"
import { querySubdomains, type SubdomainResult } from "@/lib/subdomains"
import { useSettings } from "@/lib/settings"
import { SEO } from "@/components/shared/SEO"
import { ResultCard } from "@/components/shared/ResultCard"
import { ErrorDisplay } from "@/components/shared/ErrorDisplay"
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
export function SubdomainScannerPage() {
  const { settings } = useSettings()
  const location = useLocation()
  const [domain, setDomain] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<{ data: SubdomainResult[]; queryTime: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [currentSource, setCurrentSource] = useState("")
  const [scanErrors, setScanErrors] = useState<string[]>([])
  const performSearch = useCallback(async (targetDomain: string) => {
    if (!targetDomain.trim()) return
    setStatus('loading')
    setErrorMsg("")
    setResult(null)
    setScanErrors([])
    setCurrentSource("Starting scan...")
    const startTime = performance.now();
    try {
      await querySubdomains(targetDomain, settings, (res, errs, sourceName) => {
        setResult({ data: res, queryTime: Math.round(performance.now() - startTime) });
        setScanErrors([...errs]);
        setCurrentSource(`Queried ${sourceName}...`);
      });
      setStatus('success')
    } catch (err: unknown) {
      logger.error(err)
      const message = err instanceof Error ? err.message : "An error occurred while scanning for subdomains.";
      setErrorMsg(message)
      setStatus('error')
    }
  }, [settings]);

  const lastHandledTarget = useRef<string | null>(null);
  useEffect(() => {
    const target = location.state?.target;
    if (target && target !== lastHandledTarget.current) {
      lastHandledTarget.current = target;
      setDomain(target);
      performSearch(target);
    }
  }, [location.state, performSearch]);
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    performSearch(domain)
  }
  return (
    <div className="space-y-6">
      <SEO
        title="Subdomain Scanner"
        description="Find subdomains for a given domain using multiple public databases and unauthenticated sources. Fast and easy."
        url="https://tools.noob31.com/network/subdomains"
      />
      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">Subdomain Scanner</h1>
        <p className="text-muted-foreground mt-2">Find subdomains for a given domain using multiple unauthenticated public databases.</p>
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
            {status === 'loading' ? 'Scanning...' : `Scan Subdomains`}
          </Button>
        </form>
      </Card>
      {!settings.corsProvider || settings.corsProvider === 'none' ? (
        <div className="text-sm text-amber-600 dark:text-amber-400 p-4 border border-amber-200 dark:border-amber-900/50 rounded-md bg-amber-50 dark:bg-amber-900/10">
          <strong>Warning:</strong> You must configure a CORS Proxy URL in Settings to query the public databases.
        </div>
      ) : null}
      {status === 'error' && (
        <ErrorDisplay
          title="Scan Failed"
          error={errorMsg}
          suggestion="If you get this message, try changing your CORS Proxy in Settings. CORSProxy.io is recommended. Note that some sources like HackerTarget may rate limit based on the proxy's IP."
          onRetry={handleSearch}
        />
      )}
      {status === 'loading' && !result && (
        <ResultCard title={currentSource || "Scanning..."} status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}
      {(status === 'loading' || status === 'success') && result && (
        <ResultCard
          title={`Discovered Subdomains (${result.data.length})${status === 'loading' ? ` - ${currentSource}` : ''}`}
          status={status === 'loading' ? 'loading' : 'success'}
          timeMs={result.queryTime}
          action={
            <div className="flex gap-2">
              <CopyButton data={JSON.stringify(result.data, null, 2)} text="Copy JSON" />
              <ExportButton data={result.data} filename={`${domain}-subdomains.json`} />
            </div>
          }
        >
          <div className="space-y-4">
            {scanErrors.length > 0 && status === 'success' && (
              <div className="text-sm text-amber-600 dark:text-amber-400 p-3 border border-amber-200 dark:border-amber-900/50 rounded-md bg-amber-50 dark:bg-amber-900/10">
                <strong>Some sources failed:</strong> {scanErrors.join(' | ')}
              </div>
            )}
            <div className="w-full min-w-0">
              <div className="hidden sm:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subdomain</TableHead>
                      <TableHead>Found In</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(result.data) && result.data.length > 0 ? result.data.map((item: SubdomainResult, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-xs break-all">{item.subdomain}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          <div className="flex gap-1 flex-wrap">
                            {item.sources.map(src => (
                              <span key={src} className="px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                                {src}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                          No subdomains found yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="sm:hidden space-y-3">
                {Array.isArray(result.data) && result.data.length > 0 ? result.data.map((item: SubdomainResult, i: number) => (
                  <div key={i} className="p-3 rounded-lg border bg-card shadow-sm">
                    <p className="text-xs font-semibold break-all mb-2 leading-relaxed">{item.subdomain}</p>
                    <div className="flex gap-1 flex-wrap">
                      {item.sources.map(src => (
                        <span key={src} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground uppercase font-bold tracking-tight">
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-muted-foreground p-8 border rounded-lg bg-muted/20">
                    No subdomains found yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </ResultCard>
      )}
    </div>
  )
}