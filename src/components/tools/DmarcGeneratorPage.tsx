import { useState } from "react"
import { SEO } from "@/components/shared/SEO"
import { CopyButton } from "@/components/shared/ActionButtons"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUrlQuery } from "@/lib/useUrlQuery"
import { JsonResultView } from "@/components/shared/JsonResultView"

export function DmarcGeneratorPage() {
  const [policy, setPolicy] = useState("none")
  const [sp, setSp] = useState("same")
  const [rua, setRua] = useState("")
  const [ruf, setRuf] = useState("")
  const [pct, setPct] = useState("100")
  const { target: urlTarget, isJsonMode } = useUrlQuery()

  const generateDMARC = () => {
    const parts = ["v=DMARC1"];
    parts.push(`p=${policy}`);
    if (sp !== "same") parts.push(`sp=${sp}`);
    if (pct !== "100" && pct !== "") parts.push(`pct=${pct}`);
    if (rua.trim()) parts.push(`rua=mailto:${rua.trim()}`);
    if (ruf.trim()) parts.push(`ruf=mailto:${ruf.trim()}`);
    return parts.join("; ");
  }
  const result = generateDMARC();

  if (isJsonMode) {
    return <JsonResultView status="success" data={{ record: result, policy, sp, rua, ruf, pct }} query={urlTarget} tool="DMARC Record Generator" />
  }
  return (
    <div className="space-y-6">
      <SEO
        title="DMARC Record Generator"
        description="Quickly generate a valid DMARC record to protect your domain from email fraud and set reporting policies for SPF and DKIM failures."
        url="https://tools.noob31.com/bonus/dmarc-generator"
      />
      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">DMARC Generator</h1>
        <p className="text-muted-foreground mt-2">Generate a valid Domain-based Message Authentication, Reporting, and Conformance (DMARC) record.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-6 bg-muted/20">
          <div className="space-y-4">
            <Label>Main Policy (p)</Label>
            <Select value={policy} onValueChange={setPolicy}>
              <SelectTrigger>
                <SelectValue placeholder="Select policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Monitoring mode)</SelectItem>
                <SelectItem value="quarantine">Quarantine (Send to spam folder)</SelectItem>
                <SelectItem value="reject">Reject (Block the email)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">What receiving servers should do with emails that fail DMARC.</p>
          </div>
          <div className="space-y-4">
            <Label>Subdomain Policy (sp)</Label>
            <Select value={sp} onValueChange={setSp}>
              <SelectTrigger>
                <SelectValue placeholder="Same as Main Policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="same">Same as main policy</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="quarantine">Quarantine</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Policy for subdomains. Usually same as main policy.</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Aggregate Reports Email (rua)</Label>
              <Input
                placeholder="e.g. dmarc-reports@example.com"
                value={rua}
                onChange={e => setRua(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Where to send daily aggregate XML reports.</p>
            </div>
            <div>
              <Label>Forensic/Failure Reports Email (ruf)</Label>
              <Input
                placeholder="e.g. dmarc-failures@example.com"
                value={ruf}
                onChange={e => setRuf(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Where to send individual failure reports (often unsupported by major providers).</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Percentage (pct)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                placeholder="100"
                value={pct}
                onChange={e => setPct(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Percentage of emails subjected to filtering (default 100).</p>
            </div>
          </div>
        </Card>
        <div>
          <Card className="p-6 md:sticky md:top-20 bg-primary/5 border-primary/20">
            <h3 className="font-semibold text-lg mb-4">Generated DMARC Record</h3>
            <div className="p-4 bg-background rounded-md border font-mono text-sm break-all mb-4">
              {result}
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Host/Name: <code>_dmarc</code></p>
              <CopyButton data={result} text="Copy Record" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}