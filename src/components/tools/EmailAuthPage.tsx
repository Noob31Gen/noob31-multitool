import { useState, useEffect, useCallback, useRef } from "react"
import { logger } from "@/lib/logger"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { queryDNS, type DNSResponse, type DNSRecord } from "@/lib/doh"
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { parseSPF, parseKeyValue, formatEmailAuthQuery, filterEmailAuthRecords } from "@/lib/emailAuthParsers"
const EMAIL_AUTH_INFO: Record<string, { title: string, desc: string }> = {
  SPF: { title: "SPF Record Lookup", desc: "Check Sender Policy Framework (SPF) records." },
  DKIM: { title: "DKIM Record Lookup", desc: "Check DomainKeys Identified Mail (DKIM) records." },
  DMARC: { title: "DMARC Record Lookup", desc: "Check Domain-based Message Authentication (DMARC) records." },
  BIMI: { title: "BIMI Record Lookup", desc: "Check Brand Indicators for Message Identification (BIMI) records." },
  "MTA-STS": { title: "MTA-STS Record Lookup", desc: "Check Mail Transfer Agent Strict Transport Security records." },
  TLSRPT: { title: "TLSRPT Record Lookup", desc: "Check TLS Reporting (TLSRPT) records." }
}
function ParsedAuthTable({ record, type }: { record: DNSRecord, type: string }) {
  const dataStr = record.data.replace(/"/g, '');
  const parsedFields = type === 'SPF' ? parseSPF(dataStr) : parseKeyValue(dataStr);
  return (
    <div className="space-y-4">
      <div className="p-3 bg-muted/50 rounded-md font-mono text-sm break-all border border-border/50">
        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Raw Record</p>
        {record.data}
      </div>
      <div className="hidden sm:block rounded-md border overflow-x-auto w-full min-w-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Key / Mechanism</TableHead>
              <TableHead>Value</TableHead>
              {type === 'SPF' && <TableHead>Description</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsedFields.map((field, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{field.key}</TableCell>
                <TableCell className="font-mono text-xs break-all">{field.value || '-'}</TableCell>
                {type === 'SPF' && <TableCell className="text-muted-foreground">{field.description || ''}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="sm:hidden space-y-3">
        {parsedFields.map((field, i) => (
          <div key={i} className="p-3 rounded-lg border bg-card shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">{field.key}</span>
            </div>
            {field.value && (
              <div className="p-2 bg-muted/50 rounded border border-border/50 font-mono text-xs break-all mb-2 leading-relaxed">
                {field.value}
              </div>
            )}
            {type === 'SPF' && field.description && (
              <p className="text-xs text-muted-foreground italic leading-snug">{field.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
export function EmailAuthPage() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const recordType = (type || 'spf').toUpperCase()
  const info = EMAIL_AUTH_INFO[recordType] || { title: `${recordType} Lookup`, desc: `Check ${recordType} records.` }
  const [domain, setDomain] = useState("")
  const [selector, setSelector] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<DNSResponse | null>(null)
  const [filteredRecords, setFilteredRecords] = useState<DNSRecord[]>([])
  const [errorMsg, setErrorMsg] = useState("")
  const needsSelector = ['DKIM', 'BIMI'].includes(recordType);
  const [lastRecordType, setLastRecordType] = useState(recordType)
  if (recordType !== lastRecordType) {
    setLastRecordType(recordType)
    setStatus('idle')
    setResult(null)
    setFilteredRecords([])
  }

  const performSearch = useCallback(async (targetDomain: string) => {
    if (!targetDomain.trim()) return
    setStatus('loading')
    setErrorMsg("")
    setResult(null)
    try {
      const queryTarget = formatEmailAuthQuery(targetDomain, recordType, selector);
      const res = await queryDNS(queryTarget, 'TXT', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl);
      setResult(res);
      setFilteredRecords(filterEmailAuthRecords(res.records, recordType));
      setStatus('success')
    } catch (err: unknown) {
      logger.error(err)
      const message = err instanceof Error ? err.message : "An error occurred while fetching records.";
      setErrorMsg(message)
      setStatus('error')
    }
  }, [recordType, selector, settings]);

  const location = useLocation()
  const lastHandledTarget = useRef<string | null>(null);
  useEffect(() => {
    const q = (location.state as { target?: string })?.target;
    if (q && q !== lastHandledTarget.current) {
      lastHandledTarget.current = q;
      setDomain(q);
      performSearch(q);
    }
  }, [location, performSearch]);
  const handleSearch = (e: React.FormEvent) => {
    if (e) e.preventDefault()
    performSearch(domain)
  }
  return (
    <div className="space-y-6">
      <SEO
        title={info.title}
        description={info.desc}
        url={`https://tools.noob31.com/email/${recordType.toLowerCase()}`}
      />
      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">{info.title}</h1>
        <p className="text-muted-foreground mt-2">{info.desc}</p>
      </div>
      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <Select value={recordType} onValueChange={(val) => navigate(`/email/${val.toLowerCase()}`)}>
            <SelectTrigger className="w-full sm:w-[150px] bg-background">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SPF">SPF</SelectItem>
              <SelectItem value="DKIM">DKIM</SelectItem>
              <SelectItem value="DMARC">DMARC</SelectItem>
              <SelectItem value="BIMI">BIMI</SelectItem>
              <SelectItem value="MTA-STS">MTA-STS</SelectItem>
              <SelectItem value="TLSRPT">TLSRPT</SelectItem>
            </SelectContent>
          </Select>
          {needsSelector && (
            <Input
              placeholder="Selector (e.g. default)"
              className="w-full sm:w-[150px] bg-background"
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
            />
          )}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter domain name..."
              className="pl-9 bg-background"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={status === 'loading'} className="w-full sm:w-auto">
            {status === 'loading' ? 'Checking...' : `${recordType} Lookup`}
          </Button>
        </form>
      </Card>
      {status === 'loading' && (
        <ResultCard title={`Querying ${recordType}...`} status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}
      {status === 'error' && (
        <ResultCard title="Lookup Failed" status="error" description={errorMsg}>
          <div className="text-sm text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">
            Please check the domain name and try again.
          </div>
        </ResultCard>
      )}
      {status === 'success' && result && (
        <ResultCard
          title={`${recordType} Records`}
          status="success"
          timeMs={result.queryTime}
          description={`Resolved by ${result.provider} DNS`}
          action={
            <div className="flex gap-2">
              <CopyButton data={JSON.stringify(filteredRecords, null, 2)} text="Copy JSON" />
              <ExportButton data={result} filename={`${domain}-${recordType}.json`} />
            </div>
          }
        >
          <div className="space-y-8">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record, i) => (
                <ParsedAuthTable key={i} record={record} type={recordType} />
              ))
            ) : (
              <div className="text-sm text-amber-600 dark:text-amber-400 p-4 border border-amber-200 dark:border-amber-900/50 rounded-md bg-amber-50 dark:bg-amber-900/10 text-center">
                No valid {recordType} records found for this domain.
                {result.records.length > 0 && " There are other TXT records, but none matched the required prefix."}
              </div>
            )}
          </div>
        </ResultCard>
      )}
    </div>
  )
}
