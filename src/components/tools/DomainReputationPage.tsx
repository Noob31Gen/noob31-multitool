import { useState, useEffect, useCallback, useRef } from "react"
import { useLocation } from "react-router-dom"
import { checkDomainReputation, type DomainReputationResult } from "@/lib/reputation"
import { useSettings } from "@/lib/settings"
import { SEO } from "@/components/shared/SEO"
import { ResultCard } from "@/components/shared/ResultCard"
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  CheckCircle,
  XCircle,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Activity,
  ExternalLink
} from "lucide-react"

export function DomainReputationPage() {
  const { settings } = useSettings()
  const location = useLocation()
  const [domain, setDomain] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<DomainReputationResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const performSearch = useCallback(async (targetDomain: string) => {
    if (!targetDomain.trim()) return
    setStatus('loading')
    setErrorMsg("")
    setResult(null)
    try {
      const res = await checkDomainReputation(targetDomain, settings)
      setResult(res)
      setStatus('success')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during reputation analysis.";
      setErrorMsg(message)
      setStatus('error')
    }
  }, [settings])

  const lastHandledTarget = useRef<string | null>(null)
  useEffect(() => {
    const target = (location.state as { target?: string })?.target
    if (target && target !== lastHandledTarget.current) {
      lastHandledTarget.current = target
      setDomain(target)
      performSearch(target)
    }
  }, [location, performSearch])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(domain)
  }

  // Helper styles based on reputation status
  const getStatusColor = (repStatus: string) => {
    if (repStatus === "Clean") return "text-green-500 border-green-500/20 bg-green-500/10"
    if (repStatus === "Suspicious") return "text-amber-500 border-amber-500/20 bg-amber-500/10"
    return "text-destructive border-destructive/20 bg-destructive/10"
  }

  const getStatusGradeColor = (repStatus: string) => {
    if (repStatus === "Clean") return "text-green-500"
    if (repStatus === "Suspicious") return "text-amber-500"
    return "text-destructive"
  }

  return (
    <div className="space-y-6">
      <SEO
        title="Domain Reputation Lookup"
        description="Check domain reputation scores. Scan against Spamhaus DBL, SURBL, and URIBL domain blocklists, evaluate threat history on AlienVault OTX, and verify Quad9 block status."
        url="https://tools.noob31.com/security/domain-reputation"
      />
      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">Domain Reputation Check</h1>
        <p className="text-muted-foreground mt-2">
          Scan domain names against blocklists, threat intelligence feeds, age classifications, and DNSSEC status.
        </p>
      </div>

      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="example.com"
              className="pl-9 bg-background"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={status === 'loading'} className="w-full sm:w-auto">
            {status === 'loading' ? 'Analyzing...' : 'Check Reputation'}
          </Button>
        </form>
      </Card>

      {status === 'loading' && (
        <ResultCard title="Analyzing Domain Reputation..." status="loading">
          <LoadingSkeleton />
        </ResultCard>
      )}

      {status === 'error' && (
        <ResultCard title="Lookup Failed" status="error" description={errorMsg}>
          <div className="text-sm text-destructive font-medium p-4 border border-destructive/20 rounded-md bg-destructive/10">
            Please enter a valid, active domain name.
          </div>
        </ResultCard>
      )}

      {status === 'success' && result && (
        <div className="grid gap-6 md:grid-cols-[1fr_300px] items-start">
          <div className="order-2 md:order-1 space-y-6">
            
            {/* Blocklist Card */}
            <ResultCard title="Domain Blocklists (DBLs)" status="success">
              <div className="space-y-4">
                {result.blocklists.map((block, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-md border bg-card ${
                      block.listed ? 'border-destructive/30 bg-destructive/5' : 'border-border/50'
                    }`}
                  >
                    {block.listed ? (
                      <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-semibold text-sm">{block.name}</span>
                        <Badge variant={block.listed ? "destructive" : "secondary"}>
                          {block.listed ? "LISTED" : "CLEAN"}
                        </Badge>
                      </div>
                      {block.listed && block.type && (
                        <p className="text-xs text-destructive font-semibold mt-1">
                          Category: {block.type}
                        </p>
                      )}
                      {block.listed && block.details && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                          {block.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ResultCard>

            {/* DNS & Registrar Security Checks */}
            <ResultCard title="DNS & Identity Security Checks" status="success">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Quad9 Block Check */}
                <Card className="p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-xs font-bold uppercase text-muted-foreground">Quad9 Threat Resolver</span>
                    {result.quad9Blocked ? (
                      <XCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">
                      {result.quad9Blocked ? "Blocked / Sinkholed" : "Not Blocked"}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.quad9Blocked
                        ? "Quad9 threat intelligence has blocked resolving this domain due to malware/phishing indicators."
                        : "Domain resolves correctly on Quad9 DNS servers."}
                    </p>
                  </div>
                </Card>

                {/* DNSSEC Status */}
                <Card className="p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-xs font-bold uppercase text-muted-foreground">DNSSEC Signature</span>
                    {result.dnssecActive ? (
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">
                      {result.dnssecActive ? "Active & Configured" : "Inactive / No Keys"}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.dnssecActive
                        ? "Domain records are cryptographically signed, protecting clients against cache poisoning/spoofing."
                        : "DNSSEC is not active on this domain."}
                    </p>
                  </div>
                </Card>

                {/* Domain Registration Age */}
                <Card className="p-4 sm:col-span-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex gap-3 items-start">
                    <Calendar className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-xs font-bold uppercase text-muted-foreground">Registration Age Details</span>
                      <h4 className="text-sm font-bold mt-1">
                        {result.registrationDate
                          ? `Registered on ${result.registrationDate}`
                          : "Registration date not resolved via RDAP"}
                      </h4>
                      {result.domainAgeDays !== null && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Domain age is <strong className="font-semibold text-foreground">{result.domainAgeDays} days</strong>.
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    {result.domainAgeDays !== null && (
                      <Badge
                        variant={
                          result.domainAgeDays < 30
                            ? "destructive"
                            : result.domainAgeDays < 90
                            ? "destructive"
                            : "default"
                        }
                        className="font-semibold"
                      >
                        {result.domainAgeDays < 30
                          ? "NEWLY REGISTERED (DANGER)"
                          : result.domainAgeDays < 90
                          ? "YOUNG DOMAIN (WARNING)"
                          : "MATURE DOMAIN"}
                      </Badge>
                    )}
                  </div>
                </Card>

              </div>
            </ResultCard>

            {/* AlienVault OTX Pulses */}
            <ResultCard title="Threat Intelligence (AlienVault OTX)" status="success">
              {result.otxPulses.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-md border border-destructive/20 bg-destructive/10 text-destructive text-sm font-medium mb-2">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <span>Domain matches active security threat pulses on AlienVault OTX.</span>
                  </div>
                  <div className="space-y-3">
                    {result.otxPulses.map((pulse, pIdx) => (
                      <div key={pIdx} className="p-4 border border-border/50 rounded-md bg-card/50 space-y-2">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                          <h4 className="text-sm font-bold text-primary">{pulse.name}</h4>
                          <span className="text-[10px] text-muted-foreground">
                            Reported on {pulse.created} by {pulse.author}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{pulse.description}</p>
                        {pulse.tags && pulse.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {pulse.tags.map((tag, tIdx) => (
                              <Badge key={tIdx} variant="outline" className="text-[9px] py-0 px-1 font-mono">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-md border border-border bg-green-500/10 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <div className="text-sm font-medium">
                    No active threat pulses listed for this domain on AlienVault OTX.
                  </div>
                </div>
              )}
            </ResultCard>

            {/* ThreatMiner Malware Samples */}
            <ResultCard title="Malware Threat History (ThreatMiner)" status="success">
              {result.threatMinerMalwareCount > 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-md border border-destructive/20 bg-destructive/5 text-destructive">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <div className="text-sm font-medium">
                    Found {result.threatMinerMalwareCount} malware samples associated with this domain in ThreatMiner's passive database.
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-md border border-border bg-green-500/10 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <div className="text-sm font-medium">
                    No associated malware samples found in ThreatMiner's passive database.
                  </div>
                </div>
              )}
            </ResultCard>

            {/* Manual External Threat Analysis */}
            <ResultCard title="Manual External Threat Analysis" status="success">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  For deeper verification, scan or inspect this domain directly on official security databases and threat intelligence platforms:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-3 px-4 text-left font-normal border-border/80 hover:bg-muted/50 hover:border-border"
                    onClick={() => window.open(`https://www.virustotal.com/gui/domain/${encodeURIComponent(result.domain)}`, '_blank', 'noopener,noreferrer')}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm text-foreground">VirusTotal Report</span>
                      <span className="text-[10px] text-muted-foreground">Scan domain, IPs, and historical URLs</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-3 px-4 text-left font-normal border-border/80 hover:bg-muted/50 hover:border-border"
                    onClick={() => window.open(`https://transparencyreport.google.com/safe-browsing/search?url=${encodeURIComponent(result.domain)}`, '_blank', 'noopener,noreferrer')}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm text-foreground">Google Safe Browsing</span>
                      <span className="text-[10px] text-muted-foreground">Check official site safety status</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-3 px-4 text-left font-normal border-border/80 hover:bg-muted/50 hover:border-border"
                    onClick={() => window.open(`https://otx.alienvault.com/indicator/domain/${encodeURIComponent(result.domain)}`, '_blank', 'noopener,noreferrer')}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm text-foreground">AlienVault OTX</span>
                      <span className="text-[10px] text-muted-foreground">Explore full community pulse indicators</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-3 px-4 text-left font-normal border-border/80 hover:bg-muted/50 hover:border-border"
                    onClick={() => window.open(`https://search.censys.io/search?resource=certificates&q=${encodeURIComponent(result.domain)}`, '_blank', 'noopener,noreferrer')}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm text-foreground">Search Censys Certificates</span>
                      <span className="text-[10px] text-muted-foreground">Inspect certificates and host details</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                  </Button>
                </div>
              </div>
            </ResultCard>

          </div>

          {/* Right score card */}
          <div className="order-1 md:order-2 md:sticky md:top-20 space-y-4">
            <Card className="p-6 flex flex-col items-center justify-center text-center">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                Reputation Status
              </h3>
              <div className={`text-3xl sm:text-4xl font-extrabold mb-4 px-4 py-2 border rounded-full font-brand ${getStatusColor(result.status)}`}>
                {result.status}
              </div>
              <div className={`text-7xl sm:text-8xl font-black mb-2 ${getStatusGradeColor(result.status)}`}>
                {result.score}
              </div>
              <div className="text-sm font-bold text-muted-foreground mb-4">Reputation Score</div>
              <p className="text-xs text-muted-foreground mb-6">Computed in {result.queryTime}ms</p>
              <div className="flex gap-2 w-full justify-center">
                <CopyButton data={JSON.stringify(result, null, 2)} text="Copy JSON" />
                <ExportButton data={result} filename={`${result.domain}-reputation.json`} />
              </div>
            </Card>

            <Card className="p-4 bg-muted/20 text-xs space-y-2 text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Activity className="w-4 h-4 shrink-0" />
                <span>Scoring Rationale</span>
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>Blocklist hits: -30 pts each</li>
                <li>Quad9 security block: -40 pts</li>
                <li>Newly registered (under 30d): -25 pts</li>
                <li>Young domain (under 90d): -10 pts</li>
                <li>OTX pulse association: -10 pts each</li>
                <li>DNSSEC active: +5 pts bonus</li>
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
