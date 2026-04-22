import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useSettings } from "@/lib/settings"
import { ResultCard } from "@/components/shared/ResultCard"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { parseUrl, visitUrl, type ParsedUrl, type VisitResult } from "@/lib/urlScanner"

export function UrlScannerPage() {
  const { settings } = useSettings()
  const [searchParams] = useSearchParams()
  
  const [url, setUrl] = useState("")
  const [visitEnabled, setVisitEnabled] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [parsed, setParsed] = useState<ParsedUrl | null>(null)
  const [visitData, setVisitData] = useState<VisitResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setUrl(q);
      performSearch(q, visitEnabled);
    }
  }, [searchParams]);

  const performSearch = async (targetUrl: string, doVisit: boolean) => {
    if (!targetUrl.trim()) return

    setStatus('loading')
    setErrorMsg("")
    setParsed(null)
    setVisitData(null)

    try {
      // 1. Parse URL locally
      let parsedResult: ParsedUrl;
      try {
        parsedResult = parseUrl(targetUrl);
        setParsed(parsedResult);
      } catch (e: any) {
        throw new Error("Invalid URL format: " + e.message);
      }

      // 2. Visit URL if enabled
      if (doVisit) {
        try {
          const visitRes = await visitUrl(targetUrl, settings);
          setVisitData(visitRes);
        } catch (e: any) {
           throw new Error("Failed to visit URL: " + e.message);
        }
      }
      
      setStatus('success')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "An error occurred during URL scanning.")
      setStatus('error')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    if (e) e.preventDefault()
    performSearch(url, visitEnabled)
  }

  // Handle toggle change
  const handleToggle = (checked: boolean) => {
    setVisitEnabled(checked)
    if (url.trim()) {
      performSearch(url, checked)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">URL Scanner</h1>
        <p className="text-muted-foreground mt-2">Dissect and analyze URL components, and optionally fetch live response data.</p>
      </div>

      <Card className="p-4 bg-muted/40 space-y-4">
        <div className="flex items-center space-x-2 px-1">
          <Switch 
            id="visit-mode" 
            checked={visitEnabled} 
            onCheckedChange={handleToggle} 
          />
          <Label htmlFor="visit-mode" className="cursor-pointer">
            Live Visit (Fetch Status & Headers)
          </Label>
        </div>
        
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="https://example.com/path?query=1"
              className="pl-9 bg-background"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={status === 'loading'} className="w-full sm:w-auto">
            {status === 'loading' ? 'Scanning...' : `Scan URL`}
          </Button>
        </form>
      </Card>

      {!settings.corsProxyUrl && visitEnabled && (
        <div className="text-sm text-amber-600 dark:text-amber-400 p-4 border border-amber-200 dark:border-amber-900/50 rounded-md bg-amber-50 dark:bg-amber-900/10">
          <strong>Warning:</strong> You must configure a CORS Proxy URL in Settings for the Live Visit tool to work in the browser.
        </div>
      )}

      {status === 'loading' && (
        <ResultCard title="Scanning URL..." status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}

      {status === 'error' && (
        <ResultCard title="Scan Failed" status="error" description={errorMsg}>
           <div className="text-sm text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">
            Check the URL formatting and your CORS proxy settings if Live Visit is enabled.
          </div>
        </ResultCard>
      )}

      {status === 'success' && parsed && (
        <div className="space-y-6">
          <ResultCard 
            title="URL Structure" 
            status="success"
            action={
              <div className="flex gap-2">
                <CopyButton data={JSON.stringify(parsed, null, 2)} text="Copy JSON" />
                <ExportButton data={{ parsed, visitData }} filename={`url-scan.json`} />
              </div>
            }
          >
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50 w-[150px]">Protocol</TableCell>
                    <TableCell>{parsed.protocol || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">Hostname</TableCell>
                    <TableCell>{parsed.hostname || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">Port</TableCell>
                    <TableCell>{parsed.port || 'Default'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">Path</TableCell>
                    <TableCell>{parsed.pathname || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">Hash / Fragment</TableCell>
                    <TableCell>{parsed.hash || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">Is IP Address?</TableCell>
                    <TableCell>{parsed.isIp ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </ResultCard>

          {parsed.params.length > 0 && (
             <ResultCard title="Query Parameters" status="success">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Parameter Key</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.params.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium break-all">{p.key}</TableCell>
                          <TableCell className="font-mono text-xs break-all">{p.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
             </ResultCard>
          )}

          {visitEnabled && visitData && (
             <ResultCard title={`Live Visit: HTTP ${visitData.status} ${visitData.statusText}`} status="success">
                <div className="space-y-6">
                  {visitData.redirected && (
                    <div className="p-4 border rounded-md bg-muted/30">
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">Redirect Detected</h4>
                      <p className="font-mono text-sm break-all">Final URL: {visitData.finalUrl}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">Response Headers</h4>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[250px]">Header</TableHead>
                            <TableHead>Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visitData.headers.length > 0 ? visitData.headers.map((h: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium whitespace-nowrap">{h.key}</TableCell>
                              <TableCell className="font-mono text-xs break-all">{h.value}</TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                No headers returned.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
             </ResultCard>
          )}
        </div>
      )}
    </div>
  )
}
