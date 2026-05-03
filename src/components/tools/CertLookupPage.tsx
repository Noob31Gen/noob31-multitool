import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { queryCert } from "@/lib/cert"
import { useSettings } from "@/lib/settings"
import { SEO } from "@/components/shared/SEO"
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

export function CertLookupPage() {
  const { settings } = useSettings()
  const location = useLocation()
  const [domain, setDomain] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    const target = location.state?.target;
    if (target) {
      setDomain(target);
      performSearch(target);
    }
  }, [location.state]);

  const performSearch = async (targetDomain: string) => {
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
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "An error occurred while fetching certificate data.")
      setStatus('error')
    }
  }

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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Certificate (crt.sh) Lookup</h1>
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
        <ResultCard title="Lookup Failed" status="error" description={errorMsg}>
          <div className="text-sm text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">
            Both crt.sh and the fallback API failed to resolve the query. Verify the domain exists and check your CORS proxy configuration.
          </div>
        </ResultCard>
      )}

      {status === 'success' && result && (
        <ResultCard
          title="Certificate Transparency Logs"
          status="success"
          timeMs={result.queryTime}
          action={
            <div className="flex gap-2">
              <CopyButton data={JSON.stringify(result.data, null, 2)} text="Copy JSON" />
              <ExportButton data={result.data} filename={`${domain}-certs.json`} />
            </div>
          }
        >
          <div className="rounded-md border overflow-x-auto">
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
                {Array.isArray(result.data) && result.data.length > 0 ? result.data.map((cert: any, i: number) => (
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
        </ResultCard>
      )}
    </div>
  )
}
