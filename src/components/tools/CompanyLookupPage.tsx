import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, AlertCircle, Building2, TrendingUp, Users } from "lucide-react";
import { useSettings } from "../../lib/settings";
import { getEntityBySymbol, type EntityFullInfo } from "../../lib/entitydb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { useUrlQuery } from "../../lib/useUrlQuery";
import { JsonResultView } from "../shared/JsonResultView";

export function CompanyLookupPage() {
  const { settings } = useSettings();
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EntityFullInfo | null>(null);

  const performSearch = useCallback(async (targetSymbol: string) => {
    const cleanSymbol = targetSymbol.trim().toUpperCase();
    if (!cleanSymbol) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await getEntityBySymbol(cleanSymbol, settings);
      if (!data) {
        setError("Company not found. Ensure you are using a valid stock ticker symbol (e.g., GOOGL, MSFT).");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch company data");
    } finally {
      setLoading(false);
    }
  }, [settings]);

  const { target: urlTarget, isJsonMode } = useUrlQuery();
  const lastHandledTarget = useRef<string | null>(null);

  useEffect(() => {
    if (urlTarget && urlTarget !== lastHandledTarget.current) {
      lastHandledTarget.current = urlTarget;
      setSymbol(urlTarget);
      performSearch(urlTarget);
    }
  }, [urlTarget, performSearch]);

  const handleSearch = () => {
    performSearch(symbol);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const status = loading ? 'loading' : error ? 'error' : result ? 'success' : 'idle';

  if (isJsonMode) {
    return <JsonResultView status={status} data={result} error={error || undefined} query={symbol || urlTarget} tool="Public Company Lookup" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Public Company Lookup</h1>
        <p className="text-muted-foreground">
          Search for a public company using its stock ticker symbol to view corporate and financial info via EntityDB.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. AAPL or MSFT"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                onKeyDown={onKeyDown}
                className="pl-9 font-mono bg-muted/50 border-muted-foreground/20 focus-visible:ring-primary/50 uppercase"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !symbol.trim()}
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
                    <Building2 className="w-6 h-6 text-primary" />
                    {result.entity.entity_name}
                  </CardTitle>
                  <CardDescription>
                    {result.entity.exchanges.join(", ")}: {result.entity.tickers.join(", ")}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono bg-background">
                    CIK: {result.entity.cik}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-muted/10 space-y-2">
                  <h3 className="font-bold text-sm tracking-wider uppercase text-muted-foreground">Corporate Info</h3>
                  <div className="space-y-1 text-sm">
                    {result.entity.hostname && (
                      <div><span className="text-muted-foreground">Website:</span> <a href={`https://${result.entity.hostname}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{result.entity.hostname}</a></div>
                    )}
                    {result.entity.business_address && (
                      <div><span className="text-muted-foreground">Address:</span> {result.entity.business_address}</div>
                    )}
                    {result.entity.phone && (
                      <div><span className="text-muted-foreground">Phone:</span> {result.entity.phone}</div>
                    )}
                    {result.entity.sic_description && (
                      <div><span className="text-muted-foreground">Industry:</span> {result.entity.sic_description}</div>
                    )}
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-muted/10 space-y-2">
                  <h3 className="font-bold text-sm tracking-wider uppercase text-muted-foreground">Digital Assets</h3>
                  <div className="space-y-2">
                    {result.entity.extra_info?.domain?.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground mb-1 block">Known Domains</span>
                        <div className="flex flex-wrap gap-1">
                          {result.entity.extra_info.domain.slice(0, 10).map(d => (
                            <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                          ))}
                          {result.entity.extra_info.domain.length > 10 && (
                            <Badge variant="secondary" className="text-[10px] opacity-70">+{result.entity.extra_info.domain.length - 10} more</Badge>
                          )}
                        </div>
                      </div>
                    )}
                    {result.entity.asns && result.entity.asns.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground mb-1 block">ASNs</span>
                        <div className="flex flex-wrap gap-1">
                          {result.entity.asns.map((asn: { asn: number }) => (
                            <Badge key={asn.asn} variant="outline" className="text-[10px] font-mono border-primary/20">AS{asn.asn}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {result.finance_data && result.finance_data.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Latest Financial Data
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 border rounded-lg bg-card">
                      <div className="text-[10px] uppercase text-muted-foreground font-bold">Revenue</div>
                      <div className="text-lg font-mono">${(result.finance_data[0].revenue / 1000000).toFixed(0)}M</div>
                    </div>
                    <div className="p-3 border rounded-lg bg-card">
                      <div className="text-[10px] uppercase text-muted-foreground font-bold">Net Income</div>
                      <div className="text-lg font-mono">${(result.finance_data[0].net_income / 1000000).toFixed(0)}M</div>
                    </div>
                    <div className="p-3 border rounded-lg bg-card">
                      <div className="text-[10px] uppercase text-muted-foreground font-bold">Gross Profit</div>
                      <div className="text-lg font-mono">${(result.finance_data[0].gross_profit / 1000000).toFixed(0)}M</div>
                    </div>
                    <div className="p-3 border rounded-lg bg-card">
                      <div className="text-[10px] uppercase text-muted-foreground font-bold">Report Year</div>
                      <div className="text-lg font-mono">{result.finance_data[0].report_year}</div>
                    </div>
                  </div>
                </div>
              )}

              {result.executives && result.executives.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Key Executives
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.executives.map((exec, idx) => (
                      <div key={idx} className="p-3 border rounded-lg bg-card text-sm">
                        <div className="font-bold">{exec.name}</div>
                        <div className="text-muted-foreground text-xs line-clamp-1">{exec.role || "Executive"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
