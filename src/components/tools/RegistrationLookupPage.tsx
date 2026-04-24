import { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { queryRDAP } from "@/lib/rdap"
import { queryASN } from "@/lib/asn"
import { useSettings } from "@/lib/settings"
import { ResultCard } from "@/components/shared/ResultCard"
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { parseRDAP } from "@/lib/rdapParser"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  ShieldAlert,
  Activity,
  Globe,
  List,
  Database,
  Info,
  Server,
  MapPin,
  Clock
} from "lucide-react"

const REGISTRATION_INFO: Record<string, { title: string, desc: string }> = {
  WHOIS: { title: "WHOIS Lookup", desc: "Check domain registration details via RDAP." },
  ARIN: { title: "ARIN Lookup", desc: "Check IP address registration details via RDAP." },
  ASN: { title: "ASN Lookup", desc: "Check Autonomous System Number and IP geolocation details." }
}

function RDAPRegistrationCard({ data }: { data: any }) {
  const parsed = parseRDAP(data);
  return (
    <div className="space-y-6">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium bg-muted/50 w-1/3">Name</TableCell>
              <TableCell>{parsed.name}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium bg-muted/50">Handle</TableCell>
              <TableCell>{parsed.handle}</TableCell>
            </TableRow>

            {parsed.registrar && (
              <TableRow>
                <TableCell className="font-medium bg-muted/50">Registrar</TableCell>
                <TableCell>
                  {parsed.registrar}
                  {parsed.registrarIanaId && (
                    <span className="ml-2 text-xs font-mono text-muted-foreground border bg-muted/30 px-1.5 py-0.5 rounded">
                      IANA: {parsed.registrarIanaId}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            )}
            {parsed.registrant && (
              <TableRow>
                <TableCell className="font-medium bg-muted/50">Registrant</TableCell>
                <TableCell>{parsed.registrant}</TableCell>
              </TableRow>
            )}

            {parsed.abuseContact && (
              <TableRow>
                <TableCell className="font-medium bg-muted/50">Abuse Contact</TableCell>
                <TableCell>{parsed.abuseContact}</TableCell>
              </TableRow>
            )}
            {parsed.adminContact && (
              <TableRow>
                <TableCell className="font-medium bg-muted/50">Admin Contact</TableCell>
                <TableCell>{parsed.adminContact}</TableCell>
              </TableRow>
            )}
            {parsed.techContact && (
              <TableRow>
                <TableCell className="font-medium bg-muted/50">Tech Contact</TableCell>
                <TableCell>{parsed.techContact}</TableCell>
              </TableRow>
            )}

            {parsed.creationDate && (
              <TableRow>
                <TableCell className="font-medium bg-muted/50">Creation Date</TableCell>
                <TableCell>{new Date(parsed.creationDate).toLocaleString()}</TableCell>
              </TableRow>
            )}
            {parsed.expirationDate && (
              <TableRow>
                <TableCell className="font-medium bg-muted/50">Expiration Date</TableCell>
                <TableCell>{new Date(parsed.expirationDate).toLocaleString()}</TableCell>
              </TableRow>
            )}
            {parsed.updatedDate && (
              <TableRow>
                <TableCell className="font-medium bg-muted/50">Updated Date</TableCell>
                <TableCell>{new Date(parsed.updatedDate).toLocaleString()}</TableCell>
              </TableRow>
            )}
            {parsed.ipRange && (
              <TableRow>
                <TableCell className="font-medium bg-muted/50">IP Range</TableCell>
                <TableCell>{parsed.ipRange}</TableCell>
              </TableRow>
            )}
            {parsed.country && (
              <TableRow>
                <TableCell className="font-medium bg-muted/50">Country</TableCell>
                <TableCell>{parsed.country}</TableCell>
              </TableRow>
            )}
            {parsed.nameservers.length > 0 && (
              <TableRow>
                <TableCell className="font-medium bg-muted/50 align-top">Name Servers</TableCell>
                <TableCell>
                  <ul className="list-disc pl-4 text-sm">
                    {parsed.nameservers.map((ns, i) => <li key={i}>{ns}</li>)}
                  </ul>
                </TableCell>
              </TableRow>
            )}
            {parsed.statuses.length > 0 && (
              <TableRow>
                <TableCell className="font-medium bg-muted/50 align-top">Domain Status</TableCell>
                <TableCell>
                  <ul className="list-disc pl-4 text-sm">
                    {parsed.statuses.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <h4 className="font-medium mb-2 text-sm text-muted-foreground">Raw JSON Data:</h4>
        <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/30 p-4">
          <pre className="text-xs font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(data, null, 2)}
          </pre>
        </ScrollArea>
      </div>
    </div>
  )
}

export function RegistrationLookupPage() {
  const { tool: paramTool } = useParams<{ tool: string }>()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const location = useLocation();

  const tool = (paramTool || 'whois').toUpperCase()
  const info = REGISTRATION_INFO[tool] || { title: `${tool} Lookup`, desc: `Check ${tool} details.` }

  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    setStatus('idle')
    setResult(null)
  }, [tool])

  useEffect(() => {
    const q = location.state?.target;
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [location.state]);

  const getPlaceholder = () => {
    switch (tool) {
      case 'WHOIS': return 'Enter domain name (e.g., example.com)'
      case 'ARIN': return 'Enter IP address (e.g., 8.8.8.8)'
      case 'ASN': return 'Enter IP or ASN (e.g., AS15169 or 8.8.8.8)'
      default: return 'Enter query...'
    }
  }

  const performSearch = async (targetQuery: string) => {
    const q = targetQuery.trim();
    if (!q) return;

    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    const isIP = ipv4Regex.test(q) || ipv6Regex.test(q);

    const isPrivateIP = (ip: string) => {
      if (ipv4Regex.test(ip)) {
        const parts = ip.split('.');
        const p1 = parseInt(parts[0], 10);
        const p2 = parseInt(parts[1], 10);
        if (p1 === 10 || p1 === 127 || (p1 === 169 && p2 === 254) || (p1 === 192 && p2 === 168) || (p1 === 172 && p2 >= 16 && p2 <= 31)) return true;
      } else if (ip.includes(':')) {
        const lower = ip.toLowerCase();
        if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb') || lower === '::1') return true;
      }
      return false;
    };

    if (tool === 'ARIN' && !isIP) {
      setErrorMsg("Invalid IP address format.");
      setStatus('error');
      return;
    }

    if (tool === 'ASN') {
      const isASNFormat = /^AS\d+$/i.test(q);
      if (!isASNFormat) {
        if (!isIP) {
          setErrorMsg("Input must be a valid IP address or ASN (e.g., AS15169).");
          setStatus('error');
          return;
        }
        if (isPrivateIP(q)) {
          setErrorMsg("Private, loopback, or link-local IPs cannot be queried for ASN data.");
          setStatus('error');
          return;
        }
      }
    }

    setStatus('loading');
    setErrorMsg("");
    setResult(null);

    const startTime = performance.now();

    try {
      let res;
      if (tool === 'ASN') {
        res = await queryASN(q);
      } else {
        res = await queryRDAP(q, settings);
      }

      const queryTime = Math.round(performance.now() - startTime);
      setResult({ data: res, queryTime });
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred while fetching registration data.");
      setStatus('error');
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    if (e) e.preventDefault()
    performSearch(query)
  }

  // Helper variable for cleaner ASN rendering
  const parsed = result?.data?.parsed;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{info.title}</h1>
        <p className="text-muted-foreground mt-2">{info.desc}</p>
      </div>

      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <Select value={tool} onValueChange={(val) => navigate(`/registration/${val.toLowerCase()}`)}>
            <SelectTrigger className="w-full sm:w-[150px] bg-background">
              <SelectValue placeholder="Tool" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WHOIS">WHOIS</SelectItem>
              <SelectItem value="ARIN">ARIN</SelectItem>
              <SelectItem value="ASN">ASN</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={getPlaceholder()}
              className="pl-9 bg-background"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={status === 'loading'} className="w-full sm:w-auto">
            {status === 'loading' ? 'Searching...' : `${tool} Lookup`}
          </Button>
        </form>
      </Card>

      {status === 'loading' && (
        <ResultCard title={`Querying ${tool}...`} status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}

      {status === 'error' && (
        <ResultCard title="Lookup Failed" status="error" description={errorMsg}>
          <div className="text-sm text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">
            {errorMsg.includes("fetching") || errorMsg.toLowerCase().includes("cors")
              ? "Network request failed. Note that RDAP/ASN servers frequently use strict CORS policies. If you are experiencing CORS errors, check your CORS Proxy URL in Settings."
              : "Please verify your input. Public lookups require valid, publicly routable IP addresses, domains, or ASNs. Internal networks (e.g., 10.x.x.x, 192.168.x.x) are not registered in public databases."}
          </div>
        </ResultCard>
      )}

      {status === 'success' && result && (
        <ResultCard
          title={`${tool} Results`}
          status="success"
          timeMs={result.queryTime}
          action={
            <div className="flex gap-2">
              <CopyButton data={JSON.stringify(result.data, null, 2)} text="Copy JSON" />
              <ExportButton data={result.data} filename={`${query}-${tool}.json`} />
            </div>
          }
        >

          {tool === 'ASN' && parsed && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

              {/* 1. Primary Identity Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-xl border bg-card shadow-sm gap-4">
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {parsed.org || "Unknown Entity"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {parsed.is_datacenter && <Badge variant="destructive">Datacenter</Badge>}
                    {parsed.is_vpn && <Badge variant="destructive">VPN</Badge>}
                    {parsed.is_proxy && <Badge variant="destructive">Proxy</Badge>}
                    {parsed.is_tor && <Badge variant="destructive">Tor</Badge>}
                    {parsed.is_abuser && <Badge variant="destructive">Abuser</Badge>}
                    {parsed.is_bogon && <Badge variant="destructive">Bogon</Badge>}
                    {parsed.is_crawler && <Badge variant="secondary">Crawler</Badge>}
                    {parsed.is_satellite && <Badge variant="secondary">Satellite</Badge>}
                    {parsed.is_mobile && <Badge variant="secondary">Mobile</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black font-mono leading-none">
                    {parsed.asn}
                  </div>
                  <div className="flex gap-2 justify-end mt-2">
                    <span className="text-xs border px-2 py-0.5 rounded bg-primary/10 text-primary uppercase font-bold">
                      {parsed.rir || "NO RIR"}
                    </span>
                    <span className="text-xs border px-2 py-0.5 rounded bg-muted uppercase font-bold">
                      {parsed.type || "Consumer"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 2. Identity & Registration */}
                <Card className="p-4 space-y-4 border-t-4">
                  <h4 className="text-sm font-bold uppercase flex items-center gap-2 text-zinc-400">
                    <Info className="h-4 w-4" /> Identity & Registration
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">Description</span>
                      <span className="text-right max-w-[200px] truncate" title={parsed.description}>{parsed.description || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">Domain</span>
                      <span>{parsed.domain || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">Route</span>
                      <span className="font-mono">{parsed.route || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">Created</span>
                      <span>{parsed.created || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated</span>
                      <span>{parsed.updated || "N/A"}</span>
                    </div>
                  </div>
                </Card>

                {/* 3. Security & Abuse */}
                <Card className="p-4 space-y-4 border-t-4">
                  <h4 className="text-sm font-bold uppercase flex items-center gap-2 text-destructive">
                    <ShieldAlert className="h-4 w-4" /> Security & Abuse
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">Abuser Score</span>
                      <span className={`font-bold ${parsed.is_abuser ? 'text-destructive' : 'text-green-600'}`}>
                        {parsed.abuser_score || "N/A"}
                      </span>
                    </div>
                    {(parsed.dc_name || parsed.dc_network) && (
                      <div className="flex justify-between border-b border-border/50 pb-1">
                        <span className="text-muted-foreground flex items-center gap-1"><Server className="w-3 h-3" /> Datacenter</span>
                        <span className="text-right">
                          {parsed.dc_name} <span className="font-mono text-xs block text-muted-foreground">{parsed.dc_network}</span>
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col border-b border-border/50 pb-1 pt-1">
                      <span className="text-muted-foreground text-xs uppercase font-bold mb-1">Abuse Contact</span>
                      <span className="font-mono text-xs break-all">{parsed.abuse_email || "N/A"}</span>
                      {parsed.abuse_phone && <span className="text-xs mt-0.5 text-muted-foreground">{parsed.abuse_phone}</span>}
                    </div>
                    {parsed.abuse_address && (
                      <div className="flex flex-col pt-1">
                        <span className="text-muted-foreground text-xs uppercase font-bold mb-1">Abuse Address</span>
                        <span className="text-xs leading-tight">{parsed.abuse_address}</span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* 4. Geographic Location */}
                <Card className="p-4 space-y-4 border-t-4">
                  <h4 className="text-sm font-bold uppercase flex items-center gap-2 text-blue-500">
                    <Globe className="h-4 w-4" /> Geographic Location
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">Country / Continent</span>
                      <span className="uppercase font-bold tracking-wider">
                        {parsed.country || "N/A"} {parsed.continent ? `(${parsed.continent})` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">City / State</span>
                      <span>
                        {parsed.city ? `${parsed.city}, ` : ''}{parsed.state || "Global"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">Zip Code</span>
                      <span>{parsed.zip || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Coordinates</span>
                      <span className="font-mono text-xs">{parsed.lat && parsed.lon ? `${parsed.lat}, ${parsed.lon}` : "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Timezone</span>
                      <span className="text-xs">{parsed.timezone || "N/A"}</span>
                    </div>
                  </div>
                </Card>

                {/* 5. Operations & PeeringDB */}
                <Card className="p-4 space-y-4 border-t-4">
                  <h4 className="text-sm font-bold uppercase flex items-center gap-2 text-purple-500">
                    <Activity className="h-4 w-4" /> Operations (Peering)
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">Website</span>
                      {parsed.website ? (
                        <a href={parsed.website} target="_blank" className="text-primary hover:underline truncate max-w-[180px]">{parsed.website}</a>
                      ) : <span>N/A</span>}
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">Traffic Ratio</span>
                      <span>{parsed.traffic_ratio || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">Scope</span>
                      <span>{parsed.scope || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">IRR AS-SET</span>
                      <span className="font-mono text-xs">{parsed.irr_as_set || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IX / Facilities</span>
                      <span>
                        {parsed.ix_count !== undefined ? `${parsed.ix_count} IXs` : "N/A"} / {parsed.fac_count !== undefined ? `${parsed.fac_count} Facs` : "N/A"}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* 6. Subnet/Prefix Explorer */}
              {(parsed.prefixes_v4?.length > 0 || parsed.prefixes_v6?.length > 0) && (
                <Card className="p-0 overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 border-b flex justify-between items-center">
                    <h4 className="text-sm font-bold uppercase flex items-center gap-2">
                      <List className="h-4 w-4" /> Announced Prefix Explorer
                    </h4>
                    <div className="flex gap-2">
                      <Badge variant="outline">{parsed.prefixes_v4.length} IPv4</Badge>
                      <Badge variant="outline">{parsed.prefixes_v6.length} IPv6</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-4 border-r">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">IPv4 Subnets</p>
                      <ScrollArea className="h-48 w-full rounded border bg-zinc-950 p-2">
                        <div className="grid grid-cols-2 gap-1">
                          {parsed.prefixes_v4.map((p: string, i: number) => (
                            <div key={i} className="text-[10px] font-mono text-zinc-400 hover:text-primary transition-colors cursor-default">
                              {p}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">IPv6 Subnets</p>
                      <ScrollArea className="h-48 w-full rounded border bg-zinc-950 p-2">
                        <div className="space-y-1">
                          {parsed.prefixes_v6.map((p: string, i: number) => (
                            <div key={i} className="text-[10px] font-mono text-zinc-400 hover:text-primary transition-colors cursor-default">
                              {p}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </Card>
              )}

              {/* 7. Operational Notes */}
              {parsed.notes && (
                <Card className="p-4 bg-yellow-50/10 border-yellow-500/20">
                  <h4 className="text-xs font-bold uppercase text-yellow-600 mb-2">Operational Documentation</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap italic">
                    {parsed.notes}
                  </p>
                </Card>
              )}

              {/* 8. Raw JSON for Full Context */}
              <div className="mt-8">
                <h4 className="font-medium mb-2 text-sm text-muted-foreground flex items-center gap-2">
                  <Database className="h-4 w-4" /> Complete Data Artifact
                </h4>
                <ScrollArea className="h-[400px] w-full rounded-lg border bg-zinc-950 p-4 shadow-inner">
                  <pre className="text-[10px] font-mono text-zinc-500 leading-tight">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}

          {tool !== 'ASN' && (
            <RDAPRegistrationCard data={result.data} />
          )}

        </ResultCard>
      )}
    </div>
  )
}