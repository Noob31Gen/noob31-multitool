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
import { Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
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
                <TableCell>{parsed.registrar}</TableCell>
              </TableRow>
            )}
            {parsed.registrant && (
              <TableRow>
                <TableCell className="font-medium bg-muted/50">Registrant</TableCell>
                <TableCell>{parsed.registrant}</TableCell>
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
    if (!targetQuery.trim()) return

    setStatus('loading')
    setErrorMsg("")
    setResult(null)

    const startTime = performance.now();

    try {
      let res;
      if (tool === 'ASN') {
        res = await queryASN(targetQuery, settings);
      } else {
        res = await queryRDAP(targetQuery, settings);
      }

      const queryTime = Math.round(performance.now() - startTime);
      setResult({ data: res, queryTime });
      setStatus('success')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "An error occurred while fetching registration data.")
      setStatus('error')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    if (e) e.preventDefault()
    performSearch(query)
  }

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
            Ensure you entered a valid query format. Note that RDAP servers frequently use strict CORS policies. If you are experiencing CORS errors, check your CORS Proxy URL in Settings.
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
          {tool === 'ASN' && result.data.org && (
            <div className="mb-4 p-4 rounded-md border bg-muted/20">
              <h3 className="font-semibold text-lg">{result.data.org}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 text-sm">
                <div><span className="text-muted-foreground">IP:</span> {result.data.ip}</div>
                <div><span className="text-muted-foreground">Hostname:</span> {result.data.hostname || 'N/A'}</div>
                <div><span className="text-muted-foreground">City:</span> {result.data.city}</div>
                <div><span className="text-muted-foreground">Region:</span> {result.data.region}, {result.data.country}</div>
                {result.data.asn && <div><span className="text-muted-foreground">ASN:</span> {result.data.asn.asn}</div>}
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-2 text-sm text-muted-foreground">Raw Data:</h4>
                <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/30 p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all">
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
