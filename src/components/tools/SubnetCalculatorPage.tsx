import { useState, useEffect, useRef, useCallback } from "react"
import { SEO } from "@/components/shared/SEO"
import { calculateSubnet } from "@/lib/subnet"
import { ErrorDisplay } from "@/components/shared/ErrorDisplay"
import { CopyButton } from "@/components/shared/ActionButtons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { useUrlQuery } from "@/lib/useUrlQuery"
import { JsonResultView } from "@/components/shared/JsonResultView"

interface SubnetResult {
  ip: string;
  cidr: number;
  network: string;
  firstHost: string;
  lastHost: string;
  broadcast: string;
  totalHosts: number;
  mask: string;
  wildcard: string;
  maskBinary: string | undefined;
}
export function SubnetCalculatorPage() {
  const [input, setInput] = useState("")
  const [result, setResult] = useState<SubnetResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const performCalculate = useCallback((rawInput: string) => {
    if (!rawInput.trim()) return;
    setErrorMsg("");
    try {
      let ip = rawInput.trim();
      let cidrStr = "24";
      if (ip.includes('/')) {
        const parts = ip.split('/');
        ip = parts[0];
        cidrStr = parts[1];
      }
      const cidr = parseInt(cidrStr, 10);
      if (isNaN(cidr)) throw new Error("Invalid CIDR prefix (e.g. /24)");
      const res = calculateSubnet(ip, cidr);
      setResult(res);
    } catch (err: unknown) {
      setResult(null);
      const message = err instanceof Error ? err.message : "Invalid IP or CIDR format";
      setErrorMsg(message);
    }
  }, []);

  const { target: urlTarget, isJsonMode } = useUrlQuery()
  const lastHandledTarget = useRef<string | null>(null);
  useEffect(() => {
    if (urlTarget && urlTarget !== lastHandledTarget.current) {
      lastHandledTarget.current = urlTarget;
      setInput(urlTarget);
      performCalculate(urlTarget);
    }
  }, [urlTarget, performCalculate]);

  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    performCalculate(input)
  }

  if (isJsonMode) {
    const status = result ? 'success' : errorMsg ? 'error' : 'idle';
    return <JsonResultView status={status} data={result} error={errorMsg} query={input || urlTarget} tool="IPv4 Subnet Calculator" />
  }
  return (
    <div className="space-y-6">
      <SEO
        title="IPv4 Subnet Calculator"
        description="Calculate IP address ranges, broadcast addresses, and usable host counts for any IPv4 network with CIDR notation support."
        url="https://tools.noob31.com/bonus/subnet"
      />
      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">IPv4 Subnet Calculator</h1>
        <p className="text-muted-foreground mt-2">Calculate network ranges, broadcast addresses, and usable hosts from an IP and CIDR mask.</p>
      </div>
      <Card className="p-4 bg-muted/40">
        <form onSubmit={handleCalculate} className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="IP Address with or without CIDR (e.g., 192.168.1.1/24)"
            className="w-full bg-background"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="submit" className="w-full sm:w-auto">
            Calculate Subnet
          </Button>
        </form>
      </Card>
      {errorMsg && (
        <ErrorDisplay error={errorMsg} cardWrap={false} />
      )}
      {result && (
        <Card className="overflow-hidden">
          <div className="p-4 bg-muted/50 border-b flex justify-between items-center">
            <h3 className="font-semibold text-lg">Results for {result.ip}/{result.cidr}</h3>
            <CopyButton data={JSON.stringify(result, null, 2)} text="Copy JSON" />
          </div>
          <div className="p-0">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium bg-muted/20 w-1/3">IP Address</TableCell>
                  <TableCell className="font-mono">{result.ip}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/20">Network Address</TableCell>
                  <TableCell className="font-mono text-primary font-bold">{result.network}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/20">Usable Host Range</TableCell>
                  <TableCell className="font-mono">{result.firstHost} - {result.lastHost}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/20">Broadcast Address</TableCell>
                  <TableCell className="font-mono text-amber-500">{result.broadcast}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/20">Total Usable Hosts</TableCell>
                  <TableCell className="font-mono">{result.totalHosts.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/20">Subnet Mask</TableCell>
                  <TableCell className="font-mono">{result.mask}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/20">Wildcard Mask</TableCell>
                  <TableCell className="font-mono">{result.wildcard}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/20">Binary Subnet Mask</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{result.maskBinary}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}