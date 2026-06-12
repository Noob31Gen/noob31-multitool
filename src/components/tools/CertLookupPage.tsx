import { useState, useEffect, useCallback, useRef } from "react"
import { logger } from "@/lib/logger"
import { useLocation } from "react-router-dom"
import { queryCert } from "@/lib/cert"
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
import type { NormalizedCert } from "@/lib/cert"

interface CertResult {
  data: NormalizedCert[];
  queryTime: number;
}
export function CertLookupPage() {
  const { settings } = useSettings()
  const location = useLocation()
  const [domain, setDomain] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<CertResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const performSearch = useCallback(async (targetDomain: string) => {
    if (!targetDomain.trim()) return
    setStatus('loading')
    setErrorMsg("")
    setResult(null)
    const startTime = performance.now();
    try {
      const res = await queryCert(targetDomain, settings);
      const queryTime = Math.round(performance.now() - startTime);
      setResult({ data: res, queryTime });
      setStatus('success')
    } catch (err: unknown) {
      logger.error(err)
      const message = err instanceof Error ? err.message : "An error occurred while fetching certificate data.";
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
        title="Certificate Lookup (crt.sh)"
        description="Find historical SSL/TLS certificates and Certificate Transparency (CT) logs for any domain."
        url="https://tools.noob31.com/security/cert"
      />
      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">Certificate (crt.sh) Lookup</h1>
        <p className="text-muted-foreground mt-2">Find historical SSL/TLS certificates for a domain using Certificate Transparency logs.</p>
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
            {status === 'loading' ? 'Searching...' : `Lookup Certs`}
          </Button>
        </form>
      </Card>
      {!settings.corsProvider || settings.corsProvider === 'none' ? (
        <div className="text-sm text-amber-600 dark:text-amber-400 p-4 border border-amber-200 dark:border-amber-900/50 rounded-md bg-amber-50 dark:bg-amber-900/10">
          <strong>Warning:</strong> You must configure a CORS Proxy URL in Settings. Or, <a href={`https://crt.sh/?q=${domain}`} target="_blank" rel="noreferrer" className="underline font-bold">Open directly in crt.sh</a>.
        </div>
      ) : null}
      {status === 'loading' && (
        <ResultCard title="Querying crt.sh..." status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}
      {status === 'error' && (
        <ErrorDisplay
          title="Lookup Failed"
          error={errorMsg}
          suggestion="Both crt.sh and the fallback API failed to resolve the query. Verify the domain exists and check your CORS proxy configuration."
          onRetry={handleSearch}
        />
      )}
      {status === 'success' && result && (
        <ResultCard
          title="Certificate Transparency Logs"
          status="success"
          timeMs={result.queryTime}
          action={
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`https://search.censys.io/search?resource=certificates&q=${encodeURIComponent(domain)}`, '_blank', 'noopener,noreferrer')}
              >
                Search Censys
              </Button>
              <CopyButton data={JSON.stringify(result.data, null, 2)} text="Copy JSON" />
              <ExportButton data={result.data} filename={`${domain}-certs.json`} />
            </div>
          }
        >
          <div className="w-full min-w-0">
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Not Before</TableHead>
                    <TableHead>Not After</TableHead>
                    <TableHead>Common Name</TableHead>
                    <TableHead>Issuer Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(result.data) && result.data.length > 0 ? result.data.map((cert: NormalizedCert, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap text-xs">{cert.not_before}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{cert.not_after}</TableCell>
                      <TableCell className="font-medium text-xs break-all">{cert.common_name}</TableCell>
                      <TableCell className="text-xs break-all text-muted-foreground">{cert.issuer_name}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        No certificates found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-4">
              {Array.isArray(result.data) && result.data.length > 0 ? result.data.map((cert: NormalizedCert, i: number) => (
                <div key={i} className="rounded-xl border bg-card overflow-hidden shadow-sm">
                  <div className="px-4 py-2 bg-muted/30 border-b flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Validity Period</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Not Before</p>
                        <p className="text-[10px] font-mono">{cert.not_before}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Not After</p>
                        <p className="text-[10px] font-mono">{cert.not_after}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Common Name</p>
                      <p className="text-xs font-semibold break-all leading-tight">{cert.common_name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Issuer Name</p>
                      <p className="text-[10px] text-muted-foreground break-all leading-relaxed">{cert.issuer_name}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center text-muted-foreground p-8 border rounded-lg bg-muted/20">
                  No certificates found.
                </div>
              )}
            </div>
          </div>
        </ResultCard>
      )}
    </div>
  )
}
