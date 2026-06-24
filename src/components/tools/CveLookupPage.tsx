import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Loader2, AlertCircle, Shield, Link2, ExternalLink } from "lucide-react";
import { useSettings } from "../../lib/settings";
import { queryCveDb, type CveData } from "../../lib/cvedb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function CveLookupPage() {
  const { settings } = useSettings();
  const [cveId, setCveId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CveData | null>(null);

  const handleSearch = useCallback(async (queryId: string) => {
    const cleanId = queryId.trim().toUpperCase();
    if (!cleanId) return;

    if (!cleanId.startsWith("CVE-")) {
      setError("Invalid format. CVE ID must start with 'CVE-' (e.g. CVE-2021-44228)");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await queryCveDb(cleanId, settings);
      if (!data) {
        setError("CVE not found in database.");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch CVE data");
    } finally {
      setLoading(false);
    }
  }, [settings]);

  const lastHandledHash = useRef<string | null>(null);

  // Parse CVE ID from URL hash on load
  useEffect(() => {
    const hashParam = window.location.hash.split("?cve=")[1];
    if (hashParam && hashParam !== lastHandledHash.current) {
      lastHandledHash.current = hashParam;
      const decoded = decodeURIComponent(hashParam);
      setCveId(decoded);
      handleSearch(decoded);
    }
  }, [handleSearch]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(cveId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">CVE Lookup</h1>
        <p className="text-muted-foreground">
          Search for Common Vulnerabilities and Exposures (CVE) using Shodan's CVEDB.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. CVE-2021-44228"
                value={cveId}
                onChange={(e) => setCveId(e.target.value)}
                onKeyDown={onKeyDown}
                className="pl-9 font-mono bg-muted/50 border-muted-foreground/20 focus-visible:ring-primary/50"
              />
            </div>
            <Button
              onClick={() => handleSearch(cveId)}
              disabled={loading || !cveId.trim()}
              className="sm:w-32 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lookup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="overflow-hidden border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-mono flex items-center gap-2">
                    <Shield className="w-6 h-6 text-primary" />
                    {result.cve_id}
                  </CardTitle>
                  <CardDescription>
                    Published: {result.published_time ? new Date(result.published_time).toLocaleString() : 'Unknown'}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {result.kev && (
                    <Badge variant="destructive" className="animate-pulse">
                      Known Exploited (KEV)
                    </Badge>
                  )}
                  {result.ransomware_campaign && (
                    <Badge variant="destructive" className="bg-purple-600 hover:bg-purple-700 text-white border-transparent">
                      Ransomware
                    </Badge>
                  )}
                  {result.cvss && (
                    <Badge variant={result.cvss >= 9 ? "destructive" : result.cvss >= 7 ? "default" : "secondary"}>
                      CVSS {result.cvss_version || ''}: {result.cvss.toFixed(1)}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              {/* Summary */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2">Description</h3>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {result.summary || "No description available."}
                </p>
              </div>

              {/* Action / Mitigation */}
              {result.propose_action && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 space-y-2">
                  <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                    Proposed Action
                  </h4>
                  <p className="text-sm">{result.propose_action}</p>
                </div>
              )}

              {/* Scores & Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.cvss !== null && (
                  <div className="p-4 border rounded-lg bg-muted/20">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">CVSS Score</div>
                    <div className="text-2xl font-mono">{result.cvss.toFixed(1)} <span className="text-sm text-muted-foreground ml-1">v{result.cvss_version}</span></div>
                  </div>
                )}
                {result.epss !== null && (
                  <div className="p-4 border rounded-lg bg-muted/20">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">EPSS Probability</div>
                    <div className="text-2xl font-mono">{(result.epss * 100).toFixed(2)}%</div>
                  </div>
                )}
                {result.ranking_epss !== null && (
                  <div className="p-4 border rounded-lg bg-muted/20">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">EPSS Percentile</div>
                    <div className="text-2xl font-mono">{(result.ranking_epss * 100).toFixed(2)}th</div>
                  </div>
                )}
              </div>

              {/* Affected Products */}
              {(result.vendor || result.product || (result.cpes && result.cpes.length > 0)) && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2">Affected Products</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(result.vendor || result.product) && (
                      <div className="space-y-1">
                        {result.vendor && <div className="text-sm"><span className="text-muted-foreground w-20 inline-block">Vendor:</span> <span className="font-medium">{result.vendor}</span></div>}
                        {result.product && <div className="text-sm"><span className="text-muted-foreground w-20 inline-block">Product:</span> <span className="font-medium">{result.product}</span></div>}
                        {result.version && <div className="text-sm"><span className="text-muted-foreground w-20 inline-block">Version:</span> <span className="font-medium font-mono">{result.version}</span></div>}
                      </div>
                    )}
                    {result.cpes && result.cpes.length > 0 && (
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase">CPEs</span>
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-2 pb-2">
                          {result.cpes.map((cpe, idx) => (
                            <Badge key={idx} variant="outline" className="font-mono text-[10px] break-all border-muted-foreground/30">
                              {cpe}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* References */}
              {result.references && result.references.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-muted-foreground" />
                    References
                  </h3>
                  <ul className="space-y-2">
                    {result.references.map((ref, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <ExternalLink className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                        <a href={ref} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
                          {ref}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
