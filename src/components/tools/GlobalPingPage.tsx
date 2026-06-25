import React, { useState } from "react";
import { Search, Loader2, AlertCircle, Globe2, Activity } from "lucide-react";
import { useSettings } from "../../lib/settings";
import { queryGeoping, type PingResult } from "../../lib/geonet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function GlobalPingPage() {
  const { settings } = useSettings();
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PingResult[] | null>(null);

  const handleSearch = async () => {
    const cleanTarget = target.trim();
    if (!cleanTarget) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await queryGeoping(cleanTarget, settings);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch geoping data");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const getLatencyColor = (avg: number | undefined) => {
    if (avg === undefined) return "text-muted-foreground";
    if (avg < 50) return "text-green-500";
    if (avg < 150) return "text-yellow-500";
    return "text-destructive";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Global Ping</h1>
        <p className="text-muted-foreground">
          Ping an IP or hostname from multiple geographic locations using Shodan Geonet.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. 8.8.8.8 or example.com"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                onKeyDown={onKeyDown}
                className="pl-9 font-mono bg-muted/50 border-muted-foreground/20 focus-visible:ring-primary/50"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !target.trim()}
              className="sm:w-32 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ping"}
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

      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="overflow-hidden border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-mono flex items-center gap-2">
                    <Globe2 className="w-6 h-6 text-primary" />
                    Ping Results
                  </CardTitle>
                  <CardDescription>
                    {results.length} nodes responded
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {results.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground">
                  No ping results returned.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((res, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-card space-y-3 relative overflow-hidden group hover:border-primary/50 transition-colors">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="w-12 h-12" />
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-sm">
                            {res.from_loc?.city || "Unknown City"}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                            {res.from_loc?.country || "Unknown Country"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-mono font-bold ${getLatencyColor(res.avg_rtt)}`}>
                            {res.avg_rtt !== undefined ? `${res.avg_rtt.toFixed(1)}ms` : 'ERR'}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                        <div>
                          <span className="text-muted-foreground block">Min / Max</span>
                          <span className="font-mono">{res.min_rtt?.toFixed(1) || '-'} / {res.max_rtt?.toFixed(1) || '-'} ms</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Packets (Tx/Rx)</span>
                          <span className="font-mono">{res.packets_sent || 0} / {res.packets_received || 0}</span>
                        </div>
                      </div>
                      
                      <div className="text-[10px] text-muted-foreground font-mono pt-1">
                        Resolved IP: {res.ip || "Unknown"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
