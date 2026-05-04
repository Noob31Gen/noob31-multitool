import { useState, useEffect, useCallback, useRef } from "react"
import { useLocation } from "react-router-dom"
import { useSettings } from "@/lib/settings"
import { ResultCard } from "@/components/shared/ResultCard"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Search, Globe, Lock, Unlock, Network, FolderTree,
  HelpCircle, Hash, AlertTriangle, ArrowRight, Shield,
  Clock, Server, FileText, KeyRound
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { parseUrl, visitUrl, type ParsedUrl, type VisitResult } from "@/lib/urlScanner"
import { SEO } from "@/components/shared/SEO"

const getStatusColor = (code: number) => {
  if (code >= 200 && code < 300) return "bg-green-500 hover:bg-green-600";
  if (code >= 300 && code < 400) return "bg-blue-500 hover:bg-blue-600";
  if (code >= 400 && code < 500) return "bg-orange-500 hover:bg-orange-600";
  if (code >= 500) return "bg-red-500 hover:bg-red-600";
  return "bg-gray-500 hover:bg-gray-600";
}

const InfoRow = ({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-border/50 last:border-b-0">
    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[140px] shrink-0">{label}</span>
    <span className={`text-sm break-all ${mono ? 'font-mono' : ''}`}>{value || <span className="text-muted-foreground italic">—</span>}</span>
  </div>
)
export function UrlScannerPage() {
  const { settings } = useSettings()
  const location = useLocation();
  const [url, setUrl] = useState("")
  const [visitEnabled, setVisitEnabled] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [parsed, setParsed] = useState<ParsedUrl | null>(null)
  const [visitData, setVisitData] = useState<VisitResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const performSearch = useCallback(async (targetUrl: string, doVisit: boolean) => {
    if (!targetUrl.trim()) return
    setStatus('loading')
    setErrorMsg("")
    setParsed(null)
    setVisitData(null)
    try {
      const parsedResult = parseUrl(targetUrl);
      setParsed(parsedResult);
      const promises: Promise<unknown>[] = [];
      if (doVisit) {
        promises.push(visitUrl(targetUrl, settings).then(res => setVisitData(res)));
      }
      await Promise.all(promises);
      setStatus('success')
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : "An error occurred during URL scanning.";
      setErrorMsg(message)
      setStatus('error')
    }
  }, [settings]);

  const lastHandledTarget = useRef<string | null>(null);
  useEffect(() => {
    const q = location.state?.target;
    if (q && q !== lastHandledTarget.current) {
      lastHandledTarget.current = q;
      setUrl(q);
      performSearch(q, visitEnabled);
    }
  }, [location.state, performSearch, visitEnabled]);
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(url, visitEnabled)
  }
  return (
    <div className="space-y-6">
      <SEO 
        title="URL Scanner & Parser"
        description="Decompose and analyze every component of a URL according to RFC 3986. Check HTTP status, headers, and redirects."
        url="https://tools.noob31.com/network/url-scanner"
      />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">URL Scanner</h1>
        <p className="text-muted-foreground mt-2">Decompose and analyze every component of a URL according to RFC 3986.</p>
      </div>
      <Card className="p-4 bg-muted/40 space-y-4">
        <div className="flex items-center space-x-2 px-1">
          <Switch
            id="visit-mode"
            checked={visitEnabled}
            onCheckedChange={setVisitEnabled}
          />
          <Label htmlFor="visit-mode" className="cursor-pointer">
            Live Visit (Fetch HTTP Status & Headers)
          </Label>
        </div>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="https://user:pass@sub.example.co.uk:8080/path/file.html?q=test&lang=en#section"
              className="pl-9 bg-background font-mono text-sm"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={status === 'loading'} className="w-full sm:w-auto">
            {status === 'loading' ? 'Scanning...' : `Scan URL`}
          </Button>
        </form>
      </Card>
      {!settings.corsProvider && visitEnabled && (
        <div className="text-sm text-amber-600 dark:text-amber-400 p-4 border border-amber-200 dark:border-amber-900/50 rounded-md bg-amber-50 dark:bg-amber-900/10">
          <strong>Warning:</strong> Configure a CORS Proxy URL in Settings for the Live Visit to work.
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
            Check URL formatting and CORS proxy settings if Live Visit is enabled.
          </div>
        </ResultCard>
      )}
      {status === 'success' && parsed && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-primary" />
                  Full URL Breakdown
                </span>
                <div className="flex gap-2 flex-wrap items-center">
                  <Button onClick={() => window.open(`http://virustotal.com/gui/search?query=${encodeURIComponent(parsed.original)}`, '_blank', 'noopener,noreferrer')}>View on Virustotal</Button>
                  <CopyButton data={JSON.stringify(parsed, null, 2)} text="Copy JSON" />
                  <ExportButton data={{ parsed, visitData }} filename="url-scan.json" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-md bg-muted/30 border overflow-x-auto w-full min-w-0">
                <div className="font-mono text-sm flex flex-wrap items-center gap-0 leading-loose">
                  <span className="bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-l-md border border-blue-500/30" title="Scheme">{parsed.scheme.value}://</span>
                  {parsed.authority.userinfo.hasCredentials && (
                    <span className="bg-red-500/20 text-red-700 dark:text-red-300 px-1.5 py-0.5 border-y border-red-500/30" title="Credentials">
                      {parsed.authority.userinfo.username}{parsed.authority.userinfo.password ? ':' + parsed.authority.userinfo.password : ''}@
                    </span>
                  )}
                  {parsed.authority.host.subdomain && (
                    <span className="bg-purple-500/20 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 border-y border-purple-500/30" title="Subdomain">{parsed.authority.host.subdomain}.</span>
                  )}
                  <span className="bg-green-500/20 text-green-700 dark:text-green-300 px-1.5 py-0.5 border-y border-green-500/30 font-bold" title="Domain">{parsed.authority.host.sld || parsed.authority.host.hostname}</span>
                  {parsed.authority.host.tld && (
                    <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 border-y border-emerald-500/30" title="TLD">.{parsed.authority.host.tld}</span>
                  )}
                  {!parsed.authority.port.isDefault && (
                    <span className="bg-orange-500/20 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 border-y border-orange-500/30" title="Port">:{parsed.authority.port.value}</span>
                  )}
                  {parsed.path.full !== '/' && (
                    <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 border-y border-amber-500/30" title="Path">{parsed.path.full}</span>
                  )}
                  {parsed.query.full && (
                    <span className="bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.5 border-y border-cyan-500/30" title="Query">{parsed.query.full}</span>
                  )}
                  {parsed.fragment.hasFragment && (
                    <span className="bg-pink-500/20 text-pink-700 dark:text-pink-300 px-1.5 py-0.5 rounded-r-md border border-pink-500/30" title="Fragment">#{parsed.fragment.value}</span>
                  )}
                  {!parsed.fragment.hasFragment && (
                    <span className="rounded-r-md" />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/30" />Scheme</span>
                {parsed.authority.userinfo.hasCredentials && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/30" />Credentials</span>}
                {parsed.authority.host.subdomain && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500/30" />Subdomain</span>}
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/30" />Domain</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/30" />TLD</span>
                {!parsed.authority.port.isDefault && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/30" />Port</span>}
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/30" />Path</span>
                {parsed.query.count > 0 && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-cyan-500/30" />Query</span>}
                {parsed.fragment.hasFragment && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-pink-500/30" />Fragment</span>}
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {parsed.scheme.isSecure ? <Lock className="w-4 h-4 text-green-500" /> : <Unlock className="w-4 h-4 text-orange-500" />}
                  Scheme / Protocol
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="Protocol" value={parsed.scheme.value} mono />
                <InfoRow label="Secure" value={
                  parsed.scheme.isSecure
                    ? <Badge className="bg-green-500 hover:bg-green-600">Yes</Badge>
                    : <Badge variant="destructive">No</Badge>
                } />
                <InfoRow label="Default Port" value={parsed.scheme.defaultPort || 'N/A'} mono />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Network className="w-4 h-4 text-primary" />
                  Authority / Host
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="Full Host" value={parsed.authority.full} mono />
                <InfoRow label="Hostname" value={parsed.authority.host.hostname} mono />
                {!parsed.authority.host.isIp && (
                  <>
                    <InfoRow label="Registered Domain" value={parsed.authority.host.registeredDomain} mono />
                    <InfoRow label="TLD" value={parsed.authority.host.tld} mono />
                    <InfoRow label="Second-Level Domain" value={parsed.authority.host.sld} mono />
                    <InfoRow label="Subdomain" value={parsed.authority.host.subdomain || <span className="text-muted-foreground italic">none</span>} mono />
                    <InfoRow label="Domain Labels" value={
                      <div className="flex flex-wrap gap-1">
                        {parsed.authority.host.labels.map((l, i) => (
                          <Badge key={i} variant="outline" className="font-mono text-xs">{l}</Badge>
                        ))}
                      </div>
                    } />
                  </>
                )}
                <InfoRow label="Is IP?" value={parsed.authority.host.isIp ? 'Yes' : 'No'} />
                {parsed.authority.host.isIp && <InfoRow label="IPv6?" value={parsed.authority.host.isIpv6 ? 'Yes' : 'No'} />}
                <InfoRow label="Is Localhost?" value={parsed.authority.host.isLocalhost ? 'Yes' : 'No'} />
                <InfoRow label="Port" value={
                  <span className="flex items-center gap-2">
                    <code>{parsed.authority.port.value}</code>
                    {parsed.authority.port.isDefault && <Badge variant="secondary" className="text-xs">default</Badge>}
                  </span>
                } />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderTree className="w-4 h-4 text-primary" />
                  Path
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="Full Path" value={parsed.path.full} mono />
                <InfoRow label="Directory" value={parsed.path.directoryPath} mono />
                <InfoRow label="Depth" value={String(parsed.path.depth)} />
                <InfoRow label="Segments" value={
                  parsed.path.segments.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {parsed.path.segments.map((seg, i) => (
                        <span key={i} className="px-2 py-0.5 bg-muted rounded-md text-xs font-mono border">{seg}</span>
                      ))}
                    </div>
                  ) : null
                } />
                <InfoRow label="Filename" value={parsed.path.filename} mono />
                <InfoRow label="Extension" value={parsed.path.fileExtension} mono />
                <InfoRow label="Is Directory?" value={parsed.path.isDirectory ? 'Yes' : 'No'} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  Query String
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="Raw Query" value={parsed.query.full || <span className="text-muted-foreground italic">none</span>} mono />
                <InfoRow label="Parameter Count" value={String(parsed.query.count)} />
                {parsed.query.params.length > 0 && (
                  <div className="mt-3 w-full min-w-0">
                    <div className="hidden md:block rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]">#</TableHead>
                            <TableHead className="w-[180px]">Key</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Decoded</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsed.query.params.map((p, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                              <TableCell className="font-mono text-xs font-medium break-all">{p.key}</TableCell>
                              <TableCell className="font-mono text-xs break-all">{p.value}</TableCell>
                              <TableCell className="font-mono text-xs break-all text-muted-foreground">{p.decoded !== p.value ? p.decoded : '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="md:hidden space-y-3">
                      {parsed.query.params.map((p, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-card shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Parameter {i + 1}</span>
                            <span className="text-xs font-mono font-bold text-primary break-all ml-4">{p.key}</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Raw Value</p>
                              <div className="p-2 bg-muted/50 rounded border border-border/50 font-mono text-xs break-all leading-relaxed">
                                {p.value}
                              </div>
                            </div>
                            {p.decoded !== p.value && (
                              <div>
                                <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Decoded</p>
                                <div className="p-2 bg-primary/5 rounded border border-primary/20 font-mono text-xs break-all leading-relaxed">
                                  {p.decoded}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Hash className="w-4 h-4 text-primary" />
                  Fragment / Anchor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="Has Fragment" value={parsed.fragment.hasFragment ? 'Yes' : 'No'} />
                <InfoRow label="Value" value={parsed.fragment.value} mono />
                {parsed.fragment.decoded !== parsed.fragment.value && (
                  <InfoRow label="Decoded" value={parsed.fragment.decoded} mono />
                )}
              </CardContent>
            </Card>
            {parsed.authority.userinfo.hasCredentials && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <KeyRound className="w-4 h-4" />
                    Embedded Credentials
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-3 rounded-md border border-destructive/30 bg-destructive/5 text-sm text-destructive mb-3">
                    ⚠️ This URL contains embedded credentials. This is a security risk and is often used in phishing attacks.
                  </div>
                  <InfoRow label="Username" value={parsed.authority.userinfo.username} mono />
                  <InfoRow label="Password" value={parsed.authority.userinfo.password} mono />
                </CardContent>
              </Card>
            )}
            <Card className={parsed.authority.userinfo.hasCredentials ? '' : 'lg:col-span-2'}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-primary" />
                  Metadata & Encoding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="Normalized URL" value={parsed.normalized} mono />
                <InfoRow label="Original Input" value={parsed.original} mono />
                <InfoRow label="Character Length" value={`${parsed.length} characters`} />
                <InfoRow label="Trailing Slash" value={parsed.meta.hasTrailingSlash ? 'Yes' : 'No'} />
                <InfoRow label="IDN (Punycode)" value={parsed.meta.idn ? 'Yes' : 'No'} />
                <InfoRow label="URL-Encoded Chars" value={
                  parsed.meta.encodedCharacters.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {parsed.meta.encodedCharacters.map((ec, i) => (
                        <span key={i} className="px-2 py-0.5 bg-muted rounded-md text-xs font-mono border" title={`Position ${ec.position}`}>
                          {ec.encoded} → {ec.char}
                        </span>
                      ))}
                    </div>
                  ) : <span className="text-muted-foreground italic">none</span>
                } />
              </CardContent>
            </Card>
          </div>
          {visitEnabled && visitData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 sm:gap-3 text-lg">
                  <Shield className="w-5 h-5 text-primary shrink-0" />
                  <span>Live Visit Results</span>
                  <Badge className={visitData.redirected ? "bg-blue-500 hover:bg-blue-600" : getStatusColor(visitData.status)}>
                    {visitData.redirected ? `HTTP 3xx → ${visitData.status}` : `HTTP ${visitData.status} ${visitData.statusText}`}
                  </Badge>
                  <span className="text-xs font-normal text-muted-foreground sm:ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {visitData.responseTime}ms
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {visitData.redirected && (
                  <div className="p-4 border border-amber-200 dark:border-amber-900/50 rounded-md bg-amber-50 dark:bg-amber-900/10 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                      REDIRECT DETECTED
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm text-muted-foreground w-full overflow-hidden">
                      <span className="truncate max-w-[200px] xl:max-w-[300px] font-mono text-xs" title={parsed.original}>{parsed.original}</span>
                      <ArrowRight className="w-4 h-4 hidden sm:block shrink-0" />
                      <span className="font-mono text-xs truncate text-foreground bg-background px-2 py-1 rounded border w-full sm:w-auto" title={visitData.finalUrl}>{visitData.finalUrl}</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded-md border bg-muted/20">
                    <div className="text-xs uppercase text-muted-foreground font-semibold mb-1">Content-Type</div>
                    <div className="font-mono text-sm break-all">{visitData.contentType || '—'}</div>
                  </div>
                  <div className="p-3 rounded-md border bg-muted/20">
                    <div className="text-xs uppercase text-muted-foreground font-semibold mb-1">Server</div>
                    <div className="font-mono text-sm">{visitData.server || '—'}</div>
                  </div>
                  <div className="p-3 rounded-md border bg-muted/20">
                    <div className="text-xs uppercase text-muted-foreground font-semibold mb-1 flex items-center gap-1"><Server className="w-3 h-3" /> Response Time</div>
                    <div className="font-mono text-sm">{visitData.responseTime}ms</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">Response Headers ({visitData.headers.length})</h4>
                <div className="w-full min-w-0">
                  <div className="hidden sm:block rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">Header</TableHead>
                          <TableHead>Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visitData.headers.length > 0 ? visitData.headers.map((h, i) => (
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
                  <div className="sm:hidden space-y-3">
                    {visitData.headers.length > 0 ? visitData.headers.map((h, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-card shadow-sm">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-tight">{h.key}</p>
                        <div className="p-2 bg-muted/50 rounded border border-border/50 font-mono text-xs break-all leading-relaxed text-foreground/90">
                          {h.value}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-muted-foreground p-8 border rounded-lg bg-muted/20">
                        No headers returned.
                      </div>
                    )}
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}