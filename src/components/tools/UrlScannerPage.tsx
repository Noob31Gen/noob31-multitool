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
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, ArrowRight } from "lucide-react"
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
  }

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return "bg-green-500 hover:bg-green-600";
    if (code >= 300 && code < 400) return "bg-blue-500 hover:bg-blue-600";
    if (code >= 400 && code < 500) return "bg-orange-500 hover:bg-orange-600";
    if (code >= 500) return "bg-red-500 hover:bg-red-600";
    return "bg-gray-500 hover:bg-gray-600";
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
                    <TableCell className="font-medium bg-muted/50 w-[170px]">Base URL</TableCell>
                    <TableCell>{parsed.baseUrl}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">Protocol</TableCell>
                    <TableCell>{parsed.protocol || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">Hostname</TableCell>
                    <TableCell>{parsed.hostname || '-'}</TableCell>
                  </TableRow>
                  {!parsed.isIp && (
                    <>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">Top-Level Domain (TLD)</TableCell>
                        <TableCell>{parsed.tld || '-'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">Second-Level Domain</TableCell>
                        <TableCell>{parsed.sld || '-'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">Subdomain</TableCell>
                        <TableCell>{parsed.subdomain || '-'}</TableCell>
                      </TableRow>
                    </>
                  )}
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">Port</TableCell>
                    <TableCell>{parsed.port || 'Default'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">Path</TableCell>
                    <TableCell>{parsed.pathname || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">Path Segments</TableCell>
                    <TableCell>
                      {parsed.pathSegments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {parsed.pathSegments.map((seg, i) => (
                            <span key={i} className="px-2 py-0.5 bg-muted rounded-md text-xs font-mono">{seg}</span>
                          ))}
                        </div>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">File Extension</TableCell>
                    <TableCell>{parsed.fileExtension || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">Hash / Fragment</TableCell>
                    <TableCell>{parsed.hash || '-'}</TableCell>
                  </TableRow>
                  {(parsed.username || parsed.password) && (
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">Credentials</TableCell>
                      <TableCell>
                        <div className="flex gap-2 text-sm">
                          {parsed.username && <span>User: <code className="bg-muted px-1 rounded">{parsed.username}</code></span>}
                          {parsed.password && <span>Pass: <code className="bg-muted px-1 rounded">{parsed.password}</code></span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">Total Length</TableCell>
                    <TableCell>{parsed.length} characters</TableCell>
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
             <ResultCard 
                title={
                  <div className="flex items-center gap-3">
                    <span>Live Visit Results</span>
                    <Badge className={getStatusColor(visitData.status)}>
                      HTTP {visitData.status} {visitData.statusText}
                    </Badge>
                  </div>
                } 
                status="success"
             >
                <div className="space-y-6">
                  {visitData.redirected && (
                    <div className="p-4 border border-amber-200 dark:border-amber-900/50 rounded-md bg-amber-50 dark:bg-amber-900/10 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                        REDIRECT DETECTED
                      </div>
                      <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm text-muted-foreground w-full overflow-hidden">
                        <span className="truncate max-w-[200px] xl:max-w-[300px]" title={parsed.original}>{parsed.original}</span>
                        <ArrowRight className="w-4 h-4 hidden sm:block shrink-0" />
                        <span className="font-mono truncate text-foreground bg-background px-2 py-1 rounded border w-full sm:w-auto" title={visitData.finalUrl}>{visitData.finalUrl}</span>
                      </div>
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
