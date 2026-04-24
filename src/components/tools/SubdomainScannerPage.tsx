import { useState } from "react"
import { querySubdomains, type SubdomainResult } from "@/lib/subdomains"
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

export function SubdomainScannerPage() {
  const { settings } = useSettings()
  const [domain, setDomain] = useState("")
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
      const res = await querySubdomains(domain, settings);
      const queryTime = Math.round(performance.now() - startTime);
      setResult({ data: res, queryTime });
      setStatus('success')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "An error occurred while scanning for subdomains.")
      setStatus('error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Subdomain Scanner</h1>
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

      {!settings.corsProvider && (
        <div className="text-sm text-amber-600 dark:text-amber-400 p-4 border border-amber-200 dark:border-amber-900/50 rounded-md bg-amber-50 dark:bg-amber-900/10">
          <strong>Warning:</strong> You must configure a CORS Proxy URL in Settings to query the public databases.
        </div>
      )}

      {status === 'loading' && (
        <ResultCard title="Scanning multiple sources..." status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}

      {status === 'error' && (
        <ResultCard title="Scan Failed" status="error" description={errorMsg}>
          <div className="text-sm text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">
            Please verify the domain exists and check your CORS proxy configuration. Note that some sources like HackerTarget may rate limit based on the proxy's IP.
          </div>
        </ResultCard>
      )}

      {status === 'success' && result && (
        <ResultCard
          title={`Discovered Subdomains (${result.data.length})`}
          status="success"
          timeMs={result.queryTime}
          action={
            <div className="flex gap-2">
              <CopyButton data={JSON.stringify(result.data, null, 2)} text="Copy JSON" />
              <ExportButton data={result.data} filename={`${domain}-subdomains.json`} />
            </div>
          }
        >
          <div className="rounded-md border overflow-x-auto">
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
                      No subdomains found.
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
