import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { fetchHeaders } from "@/lib/http"
import { useSettings } from "@/lib/settings"
import { ResultCard } from "@/components/shared/ResultCard"
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

interface HttpLookupPageProps {
  scheme: 'http' | 'https'
}

export function HttpLookupPage({ scheme }: HttpLookupPageProps) {
  const { settings } = useSettings()
  const [searchParams] = useSearchParams()
  const [domain, setDomain] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setDomain(q);
  }, [searchParams]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!domain.trim()) return

    setStatus('loading')
    setErrorMsg("")
    setResult(null)

    const startTime = performance.now();

    try {
      let targetUrl = domain.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `${scheme}://${targetUrl}`;
      }

      const res = await fetchHeaders(targetUrl, settings);
      const queryTime = Math.round(performance.now() - startTime);
      
      setResult({ ...res, queryTime });
      setStatus('success')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "An error occurred while fetching HTTP headers.")
      setStatus('error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{scheme.toUpperCase()} Headers Lookup</h1>
        <p className="text-muted-foreground mt-2">Retrieve HTTP response headers for a website.</p>
      </div>

      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center justify-center px-4 bg-muted border rounded-md text-sm font-medium text-muted-foreground">
            {scheme}://
          </div>
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
            {status === 'loading' ? 'Fetching...' : `Get Headers`}
          </Button>
        </form>
      </Card>

      {!settings.corsProxyUrl && (
        <div className="text-sm text-amber-600 dark:text-amber-400 p-4 border border-amber-200 dark:border-amber-900/50 rounded-md bg-amber-50 dark:bg-amber-900/10">
          <strong>Warning:</strong> You must configure a CORS Proxy URL in Settings for this tool to work in the browser.
        </div>
      )}

      {status === 'loading' && (
        <ResultCard title="Fetching headers..." status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}

      {status === 'error' && (
        <ResultCard title="Lookup Failed" status="error" description={errorMsg}>
           <div className="text-sm text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">
            Ensure the domain is correct and the server is reachable. If you are getting a network error, check your CORS Proxy URL in Settings.
          </div>
        </ResultCard>
      )}

      {status === 'success' && result && (
        <ResultCard 
          title={`HTTP ${result.status} ${result.statusText}`}
          status="success" 
          timeMs={result.queryTime}
          action={
            <div className="flex gap-2">
              <CopyButton data={JSON.stringify(result.headers, null, 2)} text="Copy JSON" />
              <ExportButton data={result} filename={`${domain}-headers.json`} />
            </div>
          }
        >
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Header</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.headers.length > 0 ? result.headers.map((h: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium whitespace-nowrap">{h.key}</TableCell>
                    <TableCell className="font-mono text-xs break-all">{h.value}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                      No headers returned. This might be a limitation of the CORS proxy you are using.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </ResultCard>
      )}
    </div>
  )
}
