import { useState } from "react"
import { parseEmailHeaders } from "@/lib/headerParser"
import { CopyButton } from "@/components/shared/ActionButtons"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

export function EmailHeaderAnalyzerPage() {
  const [input, setInput] = useState("")
  const [result, setResult] = useState<any>(null)

  const handleAnalyze = () => {
    if (!input.trim()) return;
    const res = parseEmailHeaders(input);
    setResult(res);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Header Analyzer</h1>
        <p className="text-muted-foreground mt-2">Paste raw email headers to trace routing and authentication results.</p>
      </div>

      <Card className="p-4 bg-muted/40 flex flex-col gap-3">
        <Textarea 
          placeholder="Paste raw email headers here (e.g. Return-Path: <...>, Received: from...)"
          className="min-h-[200px] font-mono text-xs bg-background"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex justify-end">
          <Button onClick={handleAnalyze}>Analyze Headers</Button>
        </div>
      </Card>

      {result && (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="p-4 bg-muted/50 border-b flex justify-between items-center">
               <h3 className="font-semibold text-lg">Message Summary</h3>
               <CopyButton data={JSON.stringify(result, null, 2)} text="Copy JSON" />
            </div>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium bg-muted/20 w-1/4">Subject</TableCell>
                  <TableCell className="font-medium">{result.subject}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/20">From</TableCell>
                  <TableCell>{result.from}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/20">To</TableCell>
                  <TableCell>{result.to}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/20">Date</TableCell>
                  <TableCell>{result.date}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/20">Message-ID</TableCell>
                  <TableCell className="font-mono text-xs">{result.messageId}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 bg-muted/50 border-b">
               <h3 className="font-semibold text-lg">Authentication Results</h3>
            </div>
            <div className="p-4 space-y-4 text-sm">
               <div>
                  <strong>SPF Check:</strong> <span className="font-mono">{result.spf}</span>
               </div>
               {result.authResults.length > 0 && (
                  <div>
                    <strong>Full Auth Results:</strong>
                    <ul className="list-disc pl-5 mt-2 space-y-1 font-mono text-xs text-muted-foreground break-all">
                      {result.authResults.map((r: string, i: number) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
               )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 bg-muted/50 border-b">
               <h3 className="font-semibold text-lg">Received Routing (Hops)</h3>
            </div>
            <div className="p-0">
               {result.hops.length > 0 ? (
                 <Table>
                    <TableBody>
                      {result.hops.map((hop: string, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium w-[80px] bg-muted/20 text-center">Hop {i + 1}</TableCell>
                          <TableCell className="font-mono text-xs break-all">{hop}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                 </Table>
               ) : (
                 <div className="p-4 text-muted-foreground text-sm">No Received headers found.</div>
               )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
