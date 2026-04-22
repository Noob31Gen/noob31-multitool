import { useState } from "react"
import { parseEmailHeaders } from "@/lib/headerParser"
import { CopyButton } from "@/components/shared/ActionButtons"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, ShieldCheck, Clock, Server, ArrowDown, User, Hash } from "lucide-react"

export function EmailHeaderAnalyzerPage() {
  const [input, setInput] = useState("")
  const [result, setResult] = useState<any>(null)

  const handleAnalyze = () => {
    if (!input.trim()) return;
    const res = parseEmailHeaders(input);
    setResult(res);
  }

  const getSpfStatus = (spfLine: string) => {
    const lower = spfLine.toLowerCase();
    if (lower.includes('pass')) return 'pass';
    if (lower.includes('fail') || lower.includes('softfail')) return 'fail';
    if (lower.includes('neutral') || lower.includes('none')) return 'warn';
    return 'unknown';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Email Header Analyzer</h1>
        <p className="text-muted-foreground mt-2">Deep dive into raw email headers to trace routing paths and authentication results.</p>
      </div>

      <Card className="p-4 bg-muted/40 flex flex-col gap-3">
        <Textarea 
          placeholder="Paste raw email headers here...&#10;&#10;e.g.&#10;Return-Path: <...>,&#10;Received: from...&#10;DKIM-Signature: v=1; ..."
          className="min-h-[250px] font-mono text-xs bg-background leading-relaxed"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          {input.trim() && (
            <Button variant="outline" onClick={() => { setInput(""); setResult(null); }}>Clear</Button>
          )}
          <Button onClick={handleAnalyze} disabled={!input.trim()}>Analyze Headers</Button>
        </div>
      </Card>

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Analysis Report</h2>
            <CopyButton data={JSON.stringify(result, null, 2)} text="Copy JSON" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="w-5 h-5 text-primary" />
                  Message Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-[100px_1fr] gap-1 text-sm">
                  <span className="font-medium text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> From</span>
                  <span className="font-medium truncate" title={result.from}>{result.from}</span>
                  
                  <span className="font-medium text-muted-foreground flex items-center gap-1 mt-2"><User className="w-3 h-3" /> To</span>
                  <span className="font-medium truncate mt-2" title={result.to}>{result.to}</span>
                  
                  <span className="font-medium text-muted-foreground flex items-center gap-1 mt-2"><Mail className="w-3 h-3" /> Subject</span>
                  <span className="font-medium truncate mt-2" title={result.subject}>{result.subject}</span>
                  
                  <span className="font-medium text-muted-foreground flex items-center gap-1 mt-2"><Clock className="w-3 h-3" /> Date</span>
                  <span className="truncate mt-2">{result.date}</span>
                  
                  <span className="font-medium text-muted-foreground flex items-center gap-1 mt-2"><Hash className="w-3 h-3" /> Msg ID</span>
                  <span className="font-mono text-xs truncate mt-2 text-muted-foreground" title={result.messageId}>{result.messageId}</span>
                </div>
              </CardContent>
            </Card>

            {/* Security & Auth Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Authentication Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Received-SPF</h4>
                  <div className="flex items-start gap-2">
                    {getSpfStatus(result.spf) === 'pass' && <Badge className="bg-green-500 hover:bg-green-600">PASS</Badge>}
                    {getSpfStatus(result.spf) === 'fail' && <Badge variant="destructive">FAIL</Badge>}
                    {getSpfStatus(result.spf) === 'warn' && <Badge variant="secondary" className="text-amber-600 border-amber-200">WARN</Badge>}
                    {getSpfStatus(result.spf) === 'unknown' && <Badge variant="outline">UNKNOWN</Badge>}
                    <span className="font-mono text-xs text-muted-foreground break-all">{result.spf}</span>
                  </div>
                </div>

                {result.authResults.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Authentication-Results</h4>
                    <div className="space-y-2 bg-muted/30 p-3 rounded-md border">
                      {result.authResults.map((r: string, i: number) => (
                        <div key={i} className="font-mono text-xs break-all text-foreground/80">{r}</div>
                      ))}
                    </div>
                  </div>
                )}
                {result.authResults.length === 0 && (
                  <div className="text-sm text-muted-foreground">No Authentication-Results header found.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Hops Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="w-5 h-5 text-primary" />
                Network Routing (Hops)
              </CardTitle>
              <CardDescription>
                Chronological path the email took from sender to receiver.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result.hops.length > 0 ? (
                <div className="space-y-2">
                  {result.hops.map((hop: string, i: number) => (
                    <div key={i} className="flex flex-col">
                      <div className="flex items-start gap-4 p-3 rounded-md border bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col items-center gap-1 min-w-[40px] pt-1">
                          <Badge variant="secondary" className="w-full justify-center">Hop {i + 1}</Badge>
                        </div>
                        <div className="font-mono text-xs break-all text-muted-foreground leading-relaxed">
                          {hop}
                        </div>
                      </div>
                      {i < result.hops.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="w-4 h-4 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground border rounded-md border-dashed">
                  No tracking hops found in these headers.
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  )
}

