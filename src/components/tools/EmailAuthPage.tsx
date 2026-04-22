import { useState } from "react"
import { queryDNS, type DNSResponse, type DNSRecord } from "@/lib/doh"
import { useSettings } from "@/lib/settings"
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

interface EmailAuthPageProps {
  defaultType: string
  title: string
  description: string
}

function ParsedAuthTable({ record, type }: { record: DNSRecord, type: string }) {
  const dataStr = record.data.replace(/"/g, '');
  const parsedFields = type === 'SPF' ? parseSPF(dataStr) : parseKeyValue(dataStr);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-muted/50 rounded-md font-mono text-sm break-all">
        {record.data}
      </div>
      <div className="rounded-md border overflow-x-auto">
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
    </div>
  )
}

export function EmailAuthPage({ defaultType, title, description }: EmailAuthPageProps) {
  const { settings } = useSettings()
  const [domain, setDomain] = useState("")
  const [selector, setSelector] = useState("default")
  const [recordType, setRecordType] = useState(defaultType)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<DNSResponse | null>(null)
  const [filteredRecords, setFilteredRecords] = useState<DNSRecord[]>([])
  const [errorMsg, setErrorMsg] = useState("")

  const needsSelector = ['DKIM', 'BIMI'].includes(recordType);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!domain.trim()) return

    setStatus('loading')
    setErrorMsg("")
    setResult(null)

    try {
      const queryTarget = formatEmailAuthQuery(domain, recordType, selector);
      const res = await queryDNS(queryTarget, 'TXT', settings.dohProvider);
      
      setResult(res);
      setFilteredRecords(filterEmailAuthRecords(res.records, recordType));
      setStatus('success')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "An error occurred while fetching records.")
      setStatus('error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2">{description}</p>
      </div>

      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <Select value={recordType} onValueChange={setRecordType}>
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
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
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
