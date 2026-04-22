import { useState, useEffect } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { queryDNS, type DNSResponse } from "@/lib/doh"
import { useSettings } from "@/lib/settings"
import { ResultCard } from "@/components/shared/ResultCard"
import { DNSResultTable } from "@/components/shared/DNSResultTable"
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

const DNS_INFO: Record<string, { title: string, desc: string }> = {
  A: { title: "A Record Lookup", desc: "Check IPv4 address (A records) for a domain." },
  AAAA: { title: "AAAA Record Lookup", desc: "Check IPv6 address (AAAA records) for a domain." },
  CNAME: { title: "CNAME Lookup", desc: "Check canonical name (alias) records for a domain." },
  MX: { title: "MX Lookup", desc: "Check Mail Exchange (MX) records to see where email is routed." },
  TXT: { title: "TXT Lookup", desc: "Check Text (TXT) records used for SPF, verification, and more." },
  SOA: { title: "SOA Lookup", desc: "Check Start of Authority (SOA) records." },
  NS: { title: "NS Lookup", desc: "Check Name Server (NS) records for a domain." },
  SRV: { title: "SRV Lookup", desc: "Check Service locator (SRV) records." },
  LOC: { title: "LOC Lookup", desc: "Check Location (LOC) records." },
  PTR: { title: "Reverse Lookup (PTR)", desc: "Check the hostname associated with an IP address." },
  IPSECKEY: { title: "IPSECKEY Lookup", desc: "Check IPSECKEY records for opportunistic encryption." }
}

// Utility to convert IP to PTR arpa format
function formatPtrQuery(input: string): string {
  input = input.trim()
  // Basic IPv4 check
  if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(input)) {
    return input.split('.').reverse().join('.') + '.in-addr.arpa'
  }
  return input
}

export function DNSLookupPage() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const { settings } = useSettings()
  
  const recordType = (type || 'a').toUpperCase()
  const info = DNS_INFO[recordType] || { title: `${recordType} Lookup`, desc: `Check ${recordType} records for a domain.` }
  
  const [domain, setDomain] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<DNSResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  // Clear results when switching tool types
  useEffect(() => {
    setStatus('idle')
    setResult(null)
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

    try {
      let queryTarget = targetDomain.trim()
      if (recordType === 'PTR') {
         queryTarget = formatPtrQuery(queryTarget)
      }
      const res = await queryDNS(queryTarget, recordType, settings.dohProvider)
      setResult(res)
      setStatus('success')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "An error occurred while fetching DNS records.")
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
        <h1 className="text-3xl font-bold tracking-tight">{info.title}</h1>
        <p className="text-muted-foreground mt-2">{info.desc}</p>
      </div>

      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <Select value={recordType} onValueChange={(val) => navigate(`/dns/${val.toLowerCase()}`)}>
            <SelectTrigger className="w-full sm:w-[120px] bg-background">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="AAAA">AAAA</SelectItem>
              <SelectItem value="CNAME">CNAME</SelectItem>
              <SelectItem value="MX">MX</SelectItem>
              <SelectItem value="TXT">TXT</SelectItem>
              <SelectItem value="SOA">SOA</SelectItem>
              <SelectItem value="NS">NS</SelectItem>
              <SelectItem value="SRV">SRV</SelectItem>
              <SelectItem value="LOC">LOC</SelectItem>
              <SelectItem value="PTR">PTR</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={recordType === 'PTR' ? "Enter IP address (e.g. 8.8.8.8)" : "Enter domain name..."}
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
        <ResultCard title="Querying DNS..." status="loading">
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
          title="DNS Records" 
          status="success" 
          timeMs={result.queryTime}
          description={`Resolved by ${result.provider} DNS`}
          action={
            <div className="flex gap-2">
              <CopyButton data={JSON.stringify(result.records, null, 2)} text="Copy JSON" />
              <ExportButton data={result} filename={`${domain}-${recordType}-dns.json`} />
            </div>
          }
        >
          <div className="space-y-6">
            <DNSResultTable records={result.records} />
            
            {result.authority && result.authority.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Authority Records</h3>
                <DNSResultTable records={result.authority} />
              </div>
            )}
            
            {result.status !== 0 && result.records.length === 0 && (
              <div className="text-sm text-amber-600 dark:text-amber-400 p-4 border border-amber-200 dark:border-amber-900/50 rounded-md bg-amber-50 dark:bg-amber-900/10">
                DNS query returned status {result.status}. The domain may not exist or has no records of this type.
              </div>
            )}
          </div>
        </ResultCard>
      )}
    </div>
  )
}

