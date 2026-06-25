import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSettings } from "@/lib/settings";
import { SEO } from "@/components/shared/SEO";
import { ResultCard } from "@/components/shared/ResultCard";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { CopyButton, ExportButton } from "@/components/shared/ActionButtons";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ShieldAlert,
  CheckCircle,
  Database,
  ExternalLink,
  Activity,
  Calendar,
  User,
  Tag,
  Link2,
  AlertCircle,
} from "lucide-react";
import {
  searchThreatIntel,
  detectInputType,
} from "@/lib/threatIntel";
import type {
  AggregatedThreatIntel,
  ThreatInputType,
} from "@/lib/threatIntel";
import { logger } from "@/lib/logger";

export function ThreatIntelPage() {
  const { settings } = useSettings();
  const location = useLocation();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<AggregatedThreatIntel | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-detect input type as user types during render
  const detectedType = detectInputType(query);

  const performSearch = useCallback(
    async (targetQuery: string) => {
      const clean = targetQuery.trim();
      if (!clean) return;

      setStatus("loading");
      setErrorMsg("");
      setResult(null);

      try {
        const intelResult = await searchThreatIntel(clean, settings);
        setResult(intelResult);
        setStatus("success");
      } catch (err: unknown) {
        logger.error(err);
        const msg = err instanceof Error ? err.message : "Threat Intel lookup failed.";
        setErrorMsg(msg);
        setStatus("error");
      }
    },
    [settings]
  );

  const lastHandledTarget = useRef<string | null>(null);
  useEffect(() => {
    const target = (location.state as { target?: string })?.target;
    if (target && target !== lastHandledTarget.current) {
      lastHandledTarget.current = target;
      setQuery(target);
      performSearch(target);
    }
  }, [location, performSearch]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    performSearch(query);
  };

  const handleQuickSearch = (newQuery: string) => {
    setQuery(newQuery);
    performSearch(newQuery);
  };

  // Helper to construct external links depending on input type
  const getExternalLinks = (val: string, type: ThreatInputType) => {
    const clean = val.trim();
    const cleanDom = clean.replace(/^(https?:\/\/)?(www\.)?/, "");

    switch (type) {
      case "ip":
        return [
          { name: "VirusTotal IP", url: `https://www.virustotal.com/gui/ip-address/${clean}` },
          { name: "Talos Intelligence", url: `https://talosintelligence.com/reputation_center/lookup?search=${clean}` },
          { name: "AlienVault OTX", url: `https://otx.alienvault.com/indicator/ip/${clean}` },
          { name: "AbuseIPDB", url: `https://www.abuseipdb.com/check/${clean}` },
          { name: "Spamhaus", url: `https://check.spamhaus.org/results/?query=${clean}` },
          { name: "IPVoid Blacklist", url: `https://www.ipvoid.com/ip-blacklist-check/${clean}/` },
        ];
      case "domain":
        return [
          { name: "VirusTotal Domain", url: `https://www.virustotal.com/gui/domain/${cleanDom}` },
          { name: "Talos Intelligence", url: `https://talosintelligence.com/reputation_center/lookup?search=${cleanDom}` },
          { name: "AlienVault OTX", url: `https://otx.alienvault.com/indicator/domain/${cleanDom}` },
          { name: "URLVoid Scan", url: `https://www.urlvoid.com/scan/${cleanDom}/` },
          { name: "Spamhaus", url: `https://check.spamhaus.org/results/?query=${cleanDom}` },
          { name: "Censys Certificates", url: `https://search.censys.io/search?resource=certificates&q=${cleanDom}` },
        ];
      case "url":
        return [
          { name: "VirusTotal URL", url: `https://www.virustotal.com/gui/search/${encodeURIComponent(clean)}` },
          { name: "Talos Intelligence", url: `https://talosintelligence.com/reputation_center/lookup?search=${encodeURIComponent(clean)}` },
          { name: "AlienVault OTX", url: `https://otx.alienvault.com/indicator/url/${encodeURIComponent(clean)}` },
          { name: "URLScan.io Portal", url: `https://urlscan.io/` },
        ];
      case "hash":
        return [
          { name: "VirusTotal Hash", url: `https://www.virustotal.com/gui/file/${clean}` },
          { name: "Talos Intelligence", url: `https://talosintelligence.com/reputation_center/lookup?search=${clean}` },
          { name: "AlienVault OTX", url: `https://otx.alienvault.com/indicator/file/${clean}` },
          { name: "MalwareBazaar Details", url: `https://malshare.com/` }, // generic fallback or malshare
          { name: "ThreatMiner Hash", url: `https://www.threatminer.org/sample.php?q=${clean}` },
        ];
      default:
        return [
          { name: "OTX Pulses Search", url: `https://otx.alienvault.com/browse/pulses?q=${encodeURIComponent(clean)}` },
          { name: "OTX Tags Search", url: `https://otx.alienvault.com/browse/pulses?tag=${encodeURIComponent(clean)}` },
          { name: "URLScan.io Search", url: `https://urlscan.io/search/#${encodeURIComponent(clean)}` },
        ];
    }
  };

  const currentExternalLinks = getExternalLinks(result?.query || query, result?.detectedType || detectedType);

  const getBadgeColor = (type: ThreatInputType) => {
    switch (type) {
      case "ip":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "domain":
        return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case "url":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "hash":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getDetectedTypeLabel = (type: ThreatInputType) => {
    switch (type) {
      case "ip":
        return "IP Address";
      case "domain":
        return "Domain Name";
      case "url":
        return "URL";
      case "hash":
        return "File Hash (MD5/SHA)";
      default:
        return "General Keyword / Tag";
    }
  };

  // Check if target is suspicious/malicious based on findings
  const getAggregatedSeverity = () => {
    if (!result) return { label: "Unknown", color: "text-muted-foreground", bg: "bg-muted" };

    const totalOtx = result.otxPulses.length;
    const totalPhish = result.phishStatsMatches.length;
    const hasMb = !!result.malwareBazaar;

    if (totalPhish > 0 || hasMb || totalOtx > 3) {
      return { label: "MALICIOUS / HIGH RISK", color: "text-destructive font-bold", bg: "bg-destructive/10 border-destructive/20" };
    }
    if (totalOtx > 0) {
      return { label: "SUSPICIOUS / WARNING", color: "text-amber-500 font-bold", bg: "bg-amber-500/10 border-amber-500/20" };
    }
    // If all sources errored out, mark as inconclusive
    const errorCount = result.sourceErrors ? Object.keys(result.sourceErrors).length : 0;
    if (errorCount > 0 && totalOtx === 0 && totalPhish === 0 && !hasMb) {
      return { label: "INCONCLUSIVE / SOURCES FAILED", color: "text-amber-500 font-bold", bg: "bg-amber-500/10 border-amber-500/20" };
    }
    return { label: "CLEAN / NO IMMEDIATE MATCHES", color: "text-green-500 font-bold", bg: "bg-green-500/10 border-green-500/20" };
  };

  const severity = getAggregatedSeverity();

  return (
    <div className="space-y-6">
      <SEO
        title="Threat Intelligence Explorer"
        description="Search domains, IPs, URLs, file hashes or keywords across AlienVault OTX, ThreatMiner, PhishStats, URLScan.io and MalwareBazaar."
        url="https://tools.noob31.com/security/threat-intel"
      />

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-foreground">
            Threat Intelligence Explorer
          </h1>
          <p className="text-muted-foreground mt-2">
            Aggregated real-time unauthenticated feeds lookup for IOCs (Indicators of Compromise).
          </p>
        </div>
      </div>

      {/* Unified Search Input */}
      <Card className="p-4 bg-muted/20 border-border/80 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Domain, IP, URL, File Hash (MD5/SHA), or keyword..."
                className="pl-10 h-12 sm:h-14 bg-background border-border/60 text-sm sm:text-base rounded-lg shadow-inner focus-visible:ring-primary/40"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={status === "loading" || !query.trim()}
              className="h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base font-semibold shadow-md shrink-0 cursor-pointer"
            >
              {status === "loading" ? "Searching Feeds..." : "Search Threat Intel"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Input Detection:</span>
            <Badge variant="outline" className={`${getBadgeColor(detectedType)} font-mono px-2 py-0.5 border`}>
              {getDetectedTypeLabel(detectedType)}
            </Badge>
            {query.trim() === "" && (
              <span className="text-[11px] text-muted-foreground/60 italic ml-2">
                Examples: 8.8.8.8, wannacry, facebook-login.com
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* Loading State */}
      {status === "loading" && (
        <ResultCard title="Aggregating Threat Intelligence Sources..." status="loading">
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
              <Activity className="w-4 h-4 animate-spin text-primary" />
              <span>Querying OTX Pulses, PhishStats, URLScan, and MalwareBazaar...</span>
            </div>
            <LoadingSkeleton />
          </div>
        </ResultCard>
      )}

      {/* Error State */}
      {status === "error" && (
        <ErrorDisplay
          title="Search Failed"
          error={errorMsg}
          suggestion="An error occurred while communicating with the threat feeds. Verify your Internet connection or check settings CORS configurations."
          onRetry={handleSearch}
        />
      )}

      {/* Idle / Welcome State */}
      {status === "idle" && !result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-1 md:col-span-2 border-border/60">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Aggregated Threat Feeds
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This dashboard queries multiple threat intelligence datasets in parallel without requiring premium API credentials. All checks occur directly inside your web browser.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-1">
                  <span className="font-semibold text-primary">AlienVault OTX</span>
                  <p className="text-muted-foreground/80">Check pulses and reputation matching domains, IPs, URLs, or hashes.</p>
                </div>
                <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-1">
                  <span className="font-semibold text-primary">PhishStats Feed</span>
                  <p className="text-muted-foreground/80">Scan recent phishing logs for target records and track threat scores.</p>
                </div>
                <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-1">
                  <span className="font-semibold text-primary">URLScan.io</span>
                  <p className="text-muted-foreground/80">Historic public scan results and screenshots of web pages.</p>
                </div>
                <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-1">
                  <span className="font-semibold text-primary">MalwareBazaar</span>
                  <p className="text-muted-foreground/80">Inspect file hash definitions, signatures, and vendor detection rate averages.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Quick Sandbox Demos</h3>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleQuickSearch("148.228.16.3")}
                  className="justify-start font-mono text-xs text-left"
                >
                  <Search className="w-3.5 h-3.5 mr-2 shrink-0 text-muted-foreground" />
                  IP Check: 148.228.16.3
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleQuickSearch("wannacry")}
                  className="justify-start font-mono text-xs text-left"
                >
                  <Search className="w-3.5 h-3.5 mr-2 shrink-0 text-muted-foreground" />
                  Keyword Check: wannacry
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleQuickSearch("202e862024b33e14fb54c9d5452d3a39e83cf31215456f962e737c35d97f53f9")}
                  className="justify-start font-mono text-xs text-left truncate"
                >
                  <Search className="w-3.5 h-3.5 mr-2 shrink-0 text-muted-foreground" />
                  Hash: Emotet Sample
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success State Results */}
      {status === "success" && result && (
        <div className="space-y-6">
          {/* Sleek Search-Engine Header Bar */}
          <div className="flex flex-col gap-4 border-b border-border/60 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Target Indicator
                  </span>
                  <Badge variant="outline" className={`${getBadgeColor(result.detectedType)} font-mono text-[10px] sm:text-xs`}>
                    {getDetectedTypeLabel(result.detectedType)}
                  </Badge>
                </div>
                <h2 className="text-base sm:text-lg md:text-xl font-bold font-mono text-foreground break-all select-all leading-tight">
                  {result.query}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`font-semibold border text-[10px] sm:text-xs ${severity.bg} ${severity.color}`}>
                    {severity.label}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 self-start md:self-auto text-xs shrink-0">
                <span className="text-muted-foreground font-mono bg-muted/60 px-2 py-1 rounded border">
                  Query Time: <strong className="font-semibold text-foreground">{result.queryTime} ms</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <CopyButton data={JSON.stringify(result, null, 2)} text="Copy" />
                  <ExportButton data={result} filename={`threat-intel-${result.query}.json`} />
                </div>
              </div>
            </div>

            {/* Horizontal External Threat Portals */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1 mr-1">
                <Link2 className="w-3.5 h-3.5 text-primary shrink-0" /> Portals:
              </span>
              {currentExternalLinks.map((link, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                  className="h-7 text-[11px] font-normal border-border/80 hover:bg-muted/50 text-muted-foreground hover:text-foreground px-3 py-0.5 rounded-full shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <span className="truncate">{link.name}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/60 shrink-0" />
                </Button>
              ))}
            </div>
          </div>

          {/* Results Feeds Tabs - Full Width */}
          <div className="space-y-6">
              {/* Source Error Banner */}
              {result.sourceErrors && Object.keys(result.sourceErrors).length > 0 && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Some threat intelligence sources failed to respond</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.sourceErrors).map(([source, errMsg]) => (
                      <Badge key={source} variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono">
                        {source}: {errMsg.length > 50 ? errMsg.substring(0, 50) + '…' : errMsg}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Tabs defaultValue="otx" className="w-full">
                <div className="w-full overflow-x-auto scrollbar-none pb-1">
                  <TabsList className="flex w-max min-w-full justify-start h-auto bg-muted/50 p-1 rounded-lg gap-1 border whitespace-nowrap">
                    <TabsTrigger value="otx" className="px-3 py-1.5 text-xs sm:text-sm shrink-0">
                      AlienVault OTX ({result.otxPulses.length})
                    </TabsTrigger>
                    {result.detectedType !== "hash" && (
                      <TabsTrigger value="phishstats" className="px-3 py-1.5 text-xs sm:text-sm shrink-0">
                        PhishStats ({result.sourceErrors?.['PhishStats'] ? '⚠' : result.phishStatsMatches.length})
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="urlscan" className="px-3 py-1.5 text-xs sm:text-sm shrink-0">
                      URLScan.io ({result.sourceErrors?.['URLScan.io'] ? '⚠' : result.urlScanHistory.length})
                    </TabsTrigger>
                    {result.detectedType === "hash" && (
                      <TabsTrigger value="malwarebazaar" className="px-3 py-1.5 text-xs sm:text-sm shrink-0">
                        MalwareBazaar
                      </TabsTrigger>
                    )}
                    {result.detectedType === "ip" && (
                      <TabsTrigger value="internetdb" className="px-3 py-1.5 text-xs sm:text-sm shrink-0">
                        InternetDB ({result.sourceErrors?.['InternetDB'] ? '⚠' : result.internetDb?.ports?.length || 0})
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                {/* Tab content AlienVault OTX */}
                <TabsContent value="otx" className="mt-4 focus-visible:ring-0">
                  <ResultCard
                    title="OTX Security Pulses"
                    description="Active threat advisory reports associated with this indicator in AlienVault OTX."
                  >
                    {result.otxValidation && result.otxValidation.length > 0 && (
                      <div className="mb-4 space-y-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                          Indicator Validation & Whitelists
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {result.otxValidation.map((val, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs px-2.5 py-1"
                            >
                              {val.name}: {val.message}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.otxRelated && (result.otxRelated.adversaries.length > 0 || result.otxRelated.malwareFamilies.length > 0 || result.otxRelated.industries.length > 0) && (
                      <div className="mb-5 p-3.5 border border-border/80 rounded-lg bg-muted/20 space-y-3.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                          Related Threat Intelligence Context
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          {result.otxRelated.adversaries.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-xs text-muted-foreground block font-semibold">Adversaries</span>
                              <div className="flex flex-wrap gap-1">
                                {result.otxRelated.adversaries.map((adv) => (
                                  <Badge key={adv} variant="destructive" className="text-[10px] font-mono">{adv}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {result.otxRelated.malwareFamilies.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-xs text-muted-foreground block font-semibold">Malware Families</span>
                              <div className="flex flex-wrap gap-1">
                                {result.otxRelated.malwareFamilies.map((fam) => (
                                  <Badge key={fam} variant="destructive" className="text-[10px] font-mono">{fam}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {result.otxRelated.industries.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-xs text-muted-foreground block font-semibold">Targeted Industries</span>
                              <div className="flex flex-wrap gap-1">
                                {result.otxRelated.industries.map((ind) => (
                                  <Badge key={ind} variant="secondary" className="text-[10px] font-mono">{ind}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {result.otxUnauthKeywordSearch ? (
                      <div className="flex items-center gap-3 p-4 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <ShieldAlert className="w-5 h-5 shrink-0" />
                        <div className="text-sm font-medium">
                          General keyword searches are not allowed by AlienVault OTX without an API key (unauthenticated queries are blocked). Please query an IP, Domain, URL, or Hash.
                        </div>
                      </div>
                    ) : result.otxPulses.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 rounded-md border border-destructive/20 bg-destructive/10 text-destructive text-xs font-medium">
                          <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                          <span>Matched active security threat advisories. Keep in mind unauthenticated rate limits apply.</span>
                        </div>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                          {result.otxPulses.map((pulse) => (
                            <div
                              key={pulse.id}
                              className="p-4 border border-border/60 rounded-lg bg-card hover:bg-muted/10 transition-colors space-y-2"
                            >
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <a
                                  href={`https://otx.alienvault.com/pulse/${pulse.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5"
                                >
                                  {pulse.name}
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border">
                                  <Calendar className="w-3 h-3" />
                                  <span>{pulse.created}</span>
                                  <span className="mx-0.5">•</span>
                                  <User className="w-3 h-3" />
                                  <span className="truncate max-w-[80px]">{pulse.author}</span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed break-words whitespace-pre-wrap line-clamp-3">
                                {pulse.description}
                              </p>
                              {pulse.tags && pulse.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1.5">
                                  {pulse.tags.map((tag, tIdx) => (
                                    <Badge
                                      key={tIdx}
                                      variant="outline"
                                      className="text-[9px] py-0 px-1 font-mono flex items-center gap-0.5"
                                    >
                                      <Tag className="w-2.5 h-2.5" />
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
                          No active threat pulses listed for this indicator on AlienVault OTX.
                        </div>
                      </div>
                    )}
                  </ResultCard>
                </TabsContent>



                {/* Tab content PhishStats */}
                <TabsContent value="phishstats" className="mt-4 focus-visible:ring-0">
                  <ResultCard
                    title="PhishStats Phishing Incidents"
                    description="Real-time listing of active and historic phishing targets."
                  >
                    {result.sourceErrors?.['PhishStats'] ? (
                      <div className="flex items-center gap-3 p-4 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div className="text-sm">
                          <span className="font-bold block">PhishStats feed failed to respond</span>
                          <span className="text-xs opacity-80">{result.sourceErrors['PhishStats']}</span>
                        </div>
                      </div>
                    ) : result.phishStatsMatches.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 rounded-md border border-destructive/20 bg-destructive/10 text-destructive text-xs font-medium">
                          <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                          <span>Matched verified phishing domains. Handle URL links with extreme caution.</span>
                        </div>
                        
                        {/* Mobile View Card List */}
                        <div className="space-y-3 md:hidden">
                          {result.phishStatsMatches.map((row) => (
                            <div key={row.id} className="p-4 border border-border/60 rounded-lg bg-card space-y-3 text-sm">
                              <div className="flex justify-between items-start gap-2">
                                <div className="space-y-1 min-w-0">
                                  <span className="font-bold text-foreground text-xs block truncate" title={row.title}>
                                    {row.title}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground break-all block leading-tight font-mono select-all select-text">
                                    {row.url}
                                  </span>
                                </div>
                                <Badge
                                  variant={row.score >= 7 ? "destructive" : "secondary"}
                                  className="font-mono text-xs shrink-0"
                                >
                                  {row.score}/10
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                                <div>
                                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Date Listed</span>
                                  <span className="text-foreground font-medium">{row.date}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">IP Address</span>
                                  <button
                                    onClick={() => handleQuickSearch(row.ip)}
                                    className="text-primary hover:underline font-bold font-mono text-[11px] cursor-pointer"
                                  >
                                    {row.ip}
                                  </button>
                                  <span className="text-[10px] text-muted-foreground block truncate">
                                    {row.country} ({row.asn})
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop View Table */}
                        <div className="hidden md:block max-h-[400px] overflow-y-auto border rounded-lg">
                          <Table>
                            <TableHeader className="bg-muted/40 sticky top-0 z-10">
                              <TableRow>
                                <TableHead className="font-bold">Target Title / URL</TableHead>
                                <TableHead className="font-bold">Date Listed</TableHead>
                                <TableHead className="font-bold">IP (Geo)</TableHead>
                                <TableHead className="font-bold text-center">Score</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {result.phishStatsMatches.map((row) => (
                                <TableRow key={row.id} className="hover:bg-muted/20">
                                  <TableCell className="max-w-[250px]">
                                    <div className="space-y-1">
                                      <span className="font-bold text-foreground text-xs block truncate" title={row.title}>
                                        {row.title}
                                      </span>
                                      <span
                                        className="text-[10px] text-muted-foreground break-all block leading-tight font-mono select-all select-text"
                                        title={row.url}
                                      >
                                        {row.url}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                    {row.date}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    <div className="space-y-0.5">
                                      <button
                                        onClick={() => handleQuickSearch(row.ip)}
                                        className="text-primary hover:underline font-bold font-mono text-[11px] cursor-pointer"
                                      >
                                        {row.ip}
                                      </button>
                                      <span className="text-[10px] text-muted-foreground block">
                                        {row.country} ({row.asn})
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge
                                      variant={row.score >= 7 ? "destructive" : "secondary"}
                                      className="font-mono text-xs"
                                    >
                                      {row.score}/10
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 rounded-md border border-border bg-green-500/10 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-5 h-5 shrink-0" />
                        <div className="text-sm font-medium">
                          No phishing records matched this query in the PhishStats index.
                        </div>
                      </div>
                    )}
                  </ResultCard>
                </TabsContent>

                {/* Tab content URLScan */}
                <TabsContent value="urlscan" className="mt-4 focus-visible:ring-0">
                  <ResultCard
                    title="URLScan.io History Search"
                    description="Historic public scans of targets conducted on URLScan.io."
                  >
                    {result.sourceErrors?.['URLScan.io'] ? (
                      <div className="flex items-center gap-3 p-4 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div className="text-sm">
                          <span className="font-bold block">URLScan.io feed failed to respond</span>
                          <span className="text-xs opacity-80">{result.sourceErrors['URLScan.io']}</span>
                        </div>
                      </div>
                    ) : result.urlScanHistory.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                          {result.urlScanHistory.map((scan, idx) => (
                            <div
                              key={idx}
                              className="p-3 border border-border/60 rounded-lg bg-card hover:bg-muted/10 transition-colors flex flex-col sm:flex-row gap-3.5"
                            >
                              {scan.screenshot ? (
                                <div
                                  className="w-full sm:w-24 h-40 sm:h-20 bg-muted rounded border overflow-hidden shrink-0 flex items-center justify-center cursor-pointer"
                                  onClick={() => window.open(`https://urlscan.io/result/${scan.id}/`, "_blank")}
                                  title="View screenshot on urlscan.io"
                                >
                                  <img
                                    src={scan.screenshot}
                                    alt="Screenshot preview"
                                    className="w-full h-full object-cover object-top hover:scale-105 transition-transform"
                                    onError={(e) => {
                                      // hide image if loading fails
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-full sm:w-24 h-20 bg-muted/60 rounded border shrink-0 flex items-center justify-center text-muted-foreground/40 text-[9px] uppercase font-bold text-center">
                                  No Preview
                                </div>
                              )}
                              <div className="space-y-1.5 min-w-0 flex-1 flex flex-col justify-between">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-muted-foreground block">
                                    {scan.time}
                                  </span>
                                  <span className="text-xs font-bold text-foreground block truncate" title={scan.title}>
                                    {scan.title}
                                  </span>
                                  <span
                                    className="text-[10px] text-primary truncate hover:underline block cursor-pointer font-mono font-semibold break-all"
                                    onClick={() => window.open(`https://urlscan.io/result/${scan.id}/`, "_blank")}
                                  >
                                    {scan.domain || scan.url}
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {scan.server && (
                                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono uppercase bg-muted/40 border-muted text-muted-foreground">
                                        Server: {scan.server}
                                      </Badge>
                                    )}
                                    {scan.mimeType && (
                                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono bg-muted/40 border-muted text-muted-foreground">
                                        Mime: {scan.mimeType}
                                      </Badge>
                                    )}
                                    {scan.requests !== undefined && (
                                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono bg-blue-500/5 text-blue-500 border-blue-500/10 dark:bg-blue-500/10">
                                        Reqs: {scan.requests}
                                      </Badge>
                                    )}
                                    {scan.uniqIPs !== undefined && (
                                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono bg-indigo-500/5 text-indigo-500 border-indigo-500/10 dark:bg-indigo-500/10">
                                        IPs: {scan.uniqIPs}
                                      </Badge>
                                    )}
                                    {scan.uniqCountries !== undefined && (
                                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono bg-purple-500/5 text-purple-500 border-purple-500/10 dark:bg-purple-500/10">
                                        Locs: {scan.uniqCountries}
                                      </Badge>
                                    )}
                                  </div>
                                  {scan.asnname && (
                                    <span className="text-[9px] text-muted-foreground block mt-1.5 truncate" title={scan.asnname}>
                                      Network: {scan.asnname}
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] px-2 w-fit font-bold gap-1 mt-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                  onClick={() => window.open(`https://urlscan.io/result/${scan.id}/`, "_blank")}
                                >
                                  Open Report
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 border rounded-lg text-center text-sm text-muted-foreground bg-muted/10">
                        No previous public scans registered for this target in URLScan.io.
                      </div>
                    )}
                  </ResultCard>
                </TabsContent>

                {/* Tab content MalwareBazaar (Abuse.ch) */}
                <TabsContent value="malwarebazaar" className="mt-4 focus-visible:ring-0">
                  <ResultCard
                    title="Abuse.ch MalwareBazaar"
                    description="Detailed malware telemetry report for the queried file hash."
                  >
                    {result.malwareBazaar ? (
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 p-3 rounded-md border border-destructive/20 bg-destructive/10 text-destructive text-xs font-semibold">
                          <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                          <span>Identified Malware Sample: {result.malwareBazaar.family}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-3.5 border rounded-lg space-y-1">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                              File Name
                            </span>
                            <span className="text-xs font-bold text-foreground truncate block font-mono">
                              {result.malwareBazaar.fileName}
                            </span>
                          </div>

                          <div className="p-3.5 border rounded-lg space-y-1">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                              Malware Family
                            </span>
                            <span className="text-xs font-bold text-primary block uppercase tracking-wide">
                              {result.malwareBazaar.family}
                            </span>
                          </div>

                          <div className="p-3.5 border rounded-lg space-y-1">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                              File Type & Size
                            </span>
                            <span className="text-xs text-foreground font-semibold">
                              {result.malwareBazaar.fileType} (
                              {(result.malwareBazaar.fileSize / 1024).toFixed(2)} KB)
                            </span>
                          </div>

                          <div className="p-3.5 border rounded-lg space-y-1">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                              First Submitted
                            </span>
                            <span className="text-xs text-foreground font-semibold">
                              {result.malwareBazaar.firstSeen}
                            </span>
                          </div>

                          {result.malwareBazaar.virustotalPercentage && (
                            <div className="p-3.5 border rounded-lg sm:col-span-2 space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                                  VirusTotal Detection Ratio
                                </span>
                                <span className="font-bold text-destructive font-mono">
                                  {result.malwareBazaar.virustotalPercentage}
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border">
                                <div
                                  className="bg-destructive h-full transition-all rounded-full"
                                  style={{
                                    width: result.malwareBazaar.virustotalPercentage.includes("%")
                                      ? result.malwareBazaar.virustotalPercentage
                                      : `${parseFloat(result.malwareBazaar.virustotalPercentage) || 0}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {result.malwareBazaar.clamAv && (
                            <div className="p-3.5 border rounded-lg bg-card">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                                ClamAV Signature
                              </span>
                              <span className="text-xs font-mono font-semibold text-destructive/80 break-words block mt-1">
                                {result.malwareBazaar.clamAv}
                              </span>
                            </div>
                          )}

                          {result.malwareBazaar.trendMicro && (
                            <div className="p-3.5 border rounded-lg bg-card">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                                TrendMicro Signature
                              </span>
                              <span className="text-xs font-mono font-semibold text-destructive/80 break-words block mt-1">
                                {result.malwareBazaar.trendMicro}
                              </span>
                            </div>
                          )}
                        </div>

                        {result.malwareBazaar.tags.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                              Tags ({result.malwareBazaar.tagsCount})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {result.malwareBazaar.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="font-mono text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 border rounded-lg text-center text-sm text-muted-foreground bg-muted/10">
                        No results found for this file hash in MalwareBazaar. Note that MalwareBazaar index relies on SHA-256 submissions.
                      </div>
                    )}
                  </ResultCard>
                </TabsContent>

                {/* Tab content InternetDB */}
                {result.detectedType === "ip" && (
                  <TabsContent value="internetdb" className="mt-4 focus-visible:ring-0">
                    <ResultCard
                      title="InternetDB IP Enrichment"
                      description="Rapid scanning of open ports, vulnerabilities, and hostnames for this IP."
                    >
                      {result.sourceErrors?.['InternetDB'] ? (
                        <div className="flex items-center gap-3 p-4 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <div className="text-sm">
                            <span className="font-bold block">InternetDB feed failed to respond</span>
                            <span className="text-xs opacity-80">{result.sourceErrors['InternetDB']}</span>
                          </div>
                        </div>
                      ) : result.internetDb ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 border rounded-lg bg-card space-y-2">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                                Open Ports ({result.internetDb.ports?.length || 0})
                              </span>
                              {result.internetDb.ports && result.internetDb.ports.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {result.internetDb.ports.map((port) => (
                                    <Badge key={port} variant="outline" className="font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                      {port}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No open ports found.</span>
                              )}
                            </div>

                            <div className="p-4 border rounded-lg bg-card space-y-2">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                                Hostnames ({result.internetDb.hostnames?.length || 0})
                              </span>
                              {result.internetDb.hostnames && result.internetDb.hostnames.length > 0 ? (
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {result.internetDb.hostnames.map((host, idx) => (
                                    <div key={idx} className="text-xs font-mono break-all">{host}</div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No hostnames associated.</span>
                              )}
                            </div>

                            <div className="p-4 border rounded-lg bg-card space-y-2">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                                Vulnerabilities (CVEs) ({result.internetDb.vulns?.length || 0})
                              </span>
                              {result.internetDb.vulns && result.internetDb.vulns.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                  {result.internetDb.vulns.map((cve) => (
                                    <a key={cve} href={`/security/cve#?cve=${cve}`} target="_blank" rel="noreferrer">
                                      <Badge variant="destructive" className="font-mono text-[10px] hover:bg-destructive/80 transition-colors cursor-pointer">
                                        {cve}
                                      </Badge>
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground text-green-500">No known vulnerabilities detected.</span>
                              )}
                            </div>

                            <div className="p-4 border rounded-lg bg-card space-y-2">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                                CPEs & Tags
                              </span>
                              <div className="flex flex-col gap-2">
                                {result.internetDb.cpes && result.internetDb.cpes.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {result.internetDb.cpes.map((cpe, idx) => (
                                      <Badge key={idx} variant="secondary" className="font-mono text-[9px] py-0 px-1">
                                        {cpe}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {result.internetDb.tags && result.internetDb.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {result.internetDb.tags.map((tag, idx) => (
                                      <Badge key={idx} variant="outline" className="font-mono text-[9px] py-0 px-1 border-primary/30 text-primary">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 border rounded-lg text-center text-sm text-muted-foreground bg-muted/10">
                          No InternetDB records found for this IP. It might not have any public open ports tracked by Shodan.
                        </div>
                      )}
                    </ResultCard>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        )}
      </div>
    );
}
