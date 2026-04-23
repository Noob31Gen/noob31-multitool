import { useState, useEffect } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { queryDNS, type DNSResponse, type DNSRecord } from "@/lib/doh"
import { useSettings } from "@/lib/settings"
import { ResultCard } from "@/components/shared/ResultCard"
import { DNSResultTable } from "@/components/shared/DNSResultTable"
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ShieldCheck, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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

const DNSSEC_INFO: Record<string, { title: string, desc: string }> = {
  DNSKEY: { title: "DNSKEY Lookup", desc: "View the public keys used to verify DNSSEC signatures." },
  DS: { title: "DS Record Lookup", desc: "Check Delegation Signer (DS) records for a domain." },
  NSEC: { title: "NSEC Record Lookup", desc: "Check Next Secure (NSEC) records." },
  NSEC3PARAM: { title: "NSEC3PARAM Lookup", desc: "Check NSEC3 parameters for a domain." },
  RRSIG: { title: "RRSIG Record Lookup", desc: "View the cryptographic signatures of DNS records." }
}

// Helper to parse DNSSEC specific fields from raw data string
function parseDNSSECData(type: string, data: string) {
  const parts = data.split(' ');
  switch (type) {
    case 'DNSKEY':
      // flags protocol algorithm publicKey
      return {
        flags: parts[0],
        protocol: parts[1],
        algorithm: parts[2],
        publicKey: parts.slice(3).join(' ')
      }
    case 'DS':
      // keyTag algorithm digestType digest
      return {
        keyTag: parts[0],
        algorithm: parts[1],
        digestType: parts[2],
        digest: parts.slice(3).join(' ')
      }
    case 'NSEC3PARAM':
      // hashAlgo flags iterations salt
      return {
        hashAlgo: parts[0],
        flags: parts[1],
        iterations: parts[2],
        salt: parts[3]
      }
    case 'RRSIG':
      // typeCovered algorithm labels originalTTL expiration inception keyTag signer signature
      return {
        typeCovered: parts[0],
        algorithm: parts[1],
        labels: parts[2],
        originalTTL: parts[3],
        expiration: parts[4],
        inception: parts[5],
        keyTag: parts[6],
        signer: parts[7],
        signature: parts.slice(8).join(' ')
      }
    default:
      return null
  }
}

function ParsedDNSSECTable({ records, type }: { records: DNSRecord[], type: string }) {
  if (records.length === 0) return null;

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Domain Name</TableHead>
            <TableHead>TTL</TableHead>
            {type === 'DNSKEY' && <><TableHead>Flags</TableHead><TableHead>Protocol</TableHead><TableHead>Algo</TableHead><TableHead>Public Key</TableHead></>}
            {type === 'DS' && <><TableHead>Key Tag</TableHead><TableHead>Algo</TableHead><TableHead>Digest Type</TableHead><TableHead>Digest</TableHead></>}
            {type === 'NSEC3PARAM' && <><TableHead>Hash Algo</TableHead><TableHead>Flags</TableHead><TableHead>Iterations</TableHead><TableHead>Salt</TableHead></>}
            {type === 'RRSIG' && <><TableHead>Type Covered</TableHead><TableHead>Algo</TableHead><TableHead>Labels</TableHead><TableHead>Orig TTL</TableHead><TableHead>Expiration</TableHead><TableHead>Inception</TableHead><TableHead>Key Tag</TableHead><TableHead>Signer</TableHead><TableHead>Signature</TableHead></>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, i) => {
            const parsed = parseDNSSECData(type, record.data);
            return (
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap">{record.name}</TableCell>
                <TableCell>{record.TTL}</TableCell>
                {type === 'DNSKEY' && parsed && (
                  <>
                    <TableCell>{parsed.flags}</TableCell>
                    <TableCell>{parsed.protocol}</TableCell>
                    <TableCell>{parsed.algorithm}</TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs" title={parsed.publicKey}>{parsed.publicKey}</TableCell>
                  </>
                )}
                {type === 'DS' && parsed && (
                  <>
                    <TableCell>{parsed.keyTag}</TableCell>
                    <TableCell>{parsed.algorithm}</TableCell>
                    <TableCell>{parsed.digestType}</TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs" title={parsed.digest}>{parsed.digest}</TableCell>
                  </>
                )}
                {type === 'NSEC3PARAM' && parsed && (
                  <>
                    <TableCell>{parsed.hashAlgo}</TableCell>
                    <TableCell>{parsed.flags}</TableCell>
                    <TableCell>{parsed.iterations}</TableCell>
                    <TableCell className="font-mono text-xs">{parsed.salt}</TableCell>
                  </>
                )}
                {type === 'RRSIG' && parsed && (
                  <>
                    <TableCell>{parsed.typeCovered}</TableCell>
                    <TableCell>{parsed.algorithm}</TableCell>
                    <TableCell>{parsed.labels}</TableCell>
                    <TableCell>{parsed.originalTTL}</TableCell>
                    <TableCell>{parsed.expiration}</TableCell>
                    <TableCell>{parsed.inception}</TableCell>
                    <TableCell>{parsed.keyTag}</TableCell>
                    <TableCell>{parsed.signer}</TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs" title={parsed.signature}>{parsed.signature}</TableCell>
                  </>
                )}
                {!parsed && <TableCell colSpan={10} className="font-mono text-xs">{record.data}</TableCell>}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}


export function DNSSECLookupPage() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const { settings } = useSettings()

  const recordType = (type || 'dnskey').toUpperCase()
  const info = DNSSEC_INFO[recordType] || { title: `${recordType} Lookup`, desc: `Check ${recordType} records.` }

  const [domain, setDomain] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<DNSResponse | null>(null)
  const [isSigned, setIsSigned] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    setStatus('idle')
    setResult(null)
    setIsSigned(null)
  }, [recordType])

  const [searchParams] = useSearchParams()
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setDomain(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (targetDomain: string) => {
    if (!targetDomain.trim()) return

    setStatus('loading')
    setErrorMsg("")
    setResult(null)
    setIsSigned(null)

    try {
      const target = targetDomain.trim();
      // Query the requested record
      const mainQuery = queryDNS(target, recordType, settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl);

      // Concurrently query DNSKEY to determine if domain is DNSSEC signed
      const dnskeyQuery = recordType === 'DNSKEY' ? mainQuery : queryDNS(target, 'DNSKEY', settings.dohProvider, settings.customDnsUrl, settings.corsProvider, settings.customCorsUrl);

      const [res, dnskeyRes] = await Promise.all([mainQuery, dnskeyQuery]);

      setResult(res);
      setIsSigned(dnskeyRes.records && dnskeyRes.records.length > 0);
      setStatus('success')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "An error occurred while fetching DNSSEC records.")
      setStatus('error')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    if (e) e.preventDefault()
    performSearch(domain)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{info.title}</h1>
        <p className="text-muted-foreground mt-2">{info.desc}</p>
      </div>

      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <Select value={recordType} onValueChange={(val) => navigate(`/dnssec/${val.toLowerCase()}`)}>
            <SelectTrigger className="w-full sm:w-[150px] bg-background">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DNSKEY">DNSKEY</SelectItem>
              <SelectItem value="DS">DS</SelectItem>
              <SelectItem value="NSEC">NSEC</SelectItem>
              <SelectItem value="NSEC3PARAM">NSEC3PARAM</SelectItem>
              <SelectItem value="RRSIG">RRSIG</SelectItem>
            </SelectContent>
          </Select>

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
        <ResultCard title="Querying DNSSEC..." status="loading">
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
          title="DNSSEC Records"
          status="success"
          timeMs={result.queryTime}
          description={`Resolved by ${result.provider} DNS`}
          action={
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {isSigned !== null && (
                <Badge variant={isSigned ? "default" : "secondary"} className={isSigned ? "bg-green-500 hover:bg-green-600 gap-1" : "gap-1"}>
                  {isSigned ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                  {isSigned ? "DNSSEC Signed" : "Unsigned"}
                </Badge>
              )}
              <div className="flex gap-2 flex-wrap">
                <CopyButton data={JSON.stringify(result.records, null, 2)} text="Copy JSON" />
                <ExportButton data={result} filename={`${domain}-${recordType}-dnssec.json`} />
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            {result.records.length > 0 ? (
              ['DNSKEY', 'DS', 'NSEC3PARAM', 'RRSIG'].includes(recordType) ? (
                <ParsedDNSSECTable records={result.records} type={recordType} />
              ) : (
                <DNSResultTable records={result.records} />
              )
            ) : (
              <div className="text-sm text-muted-foreground p-4 text-center border rounded-md">
                No {recordType} records found.
              </div>
            )}

            {result.authority && result.authority.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Authority Records</h3>
                <DNSResultTable records={result.authority} />
              </div>
            )}
          </div>
        </ResultCard>
      )}
    </div>
  )
}
