import { useState } from "react"
import { SEO } from "@/components/shared/SEO"
import { CopyButton } from "@/components/shared/ActionButtons"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
export function SpfGeneratorPage() {
  const [a, setA] = useState(true)
  const [mx, setMx] = useState(true)
  const [includes, setIncludes] = useState("")
  const [ipv4s, setIpv4s] = useState("")
  const [qualifier, setQualifier] = useState("-all")
  const generateSPF = () => {
    let parts = ["v=spf1"];
    if (a) parts.push("a");
    if (mx) parts.push("mx");
    if (ipv4s.trim()) {
      parts.push(...ipv4s.split(',').map(ip => `ip4:${ip.trim()}`).filter(x => x !== 'ip4:'));
    }
    if (includes.trim()) {
      parts.push(...includes.split(',').map(inc => `include:${inc.trim()}`).filter(x => x !== 'include:'));
    }
    parts.push(qualifier);
    return parts.join(" ");
  }
  const result = generateSPF();
  return (
    <div className="space-y-6">
      <SEO 
        title="SPF Record Generator"
        description="Easily generate a valid Sender Policy Framework (SPF) TXT record for your domain to prevent email spoofing and improve deliverability."
        url="https://tools.noob31.com/bonus/spf-generator"
      />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">SPF Generator</h1>
        <p className="text-muted-foreground mt-2">Generate a valid Sender Policy Framework (SPF) TXT record.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-6 bg-muted/20">
          <div className="space-y-4">
             <h3 className="text-lg font-medium">Standard Mechanisms</h3>
             <div className="flex items-center space-x-2">
               <Checkbox id="a" checked={a} onCheckedChange={(c: any) => setA(!!c)} />
               <Label htmlFor="a">Allow servers listed in A records to send email (a)</Label>
             </div>
             <div className="flex items-center space-x-2">
               <Checkbox id="mx" checked={mx} onCheckedChange={(c: any) => setMx(!!c)} />
               <Label htmlFor="mx">Allow servers listed in MX records to send email (mx)</Label>
             </div>
          </div>
          <div className="space-y-4">
             <div>
               <Label>IPv4 Addresses (comma separated)</Label>
               <Input 
                 placeholder="e.g. 192.168.0.1, 10.0.0.1" 
                 value={ipv4s} 
                 onChange={e => setIpv4s(e.target.value)} 
                 className="mt-1"
               />
               <p className="text-xs text-muted-foreground mt-1">Authorized IP addresses (ip4)</p>
             </div>
             <div>
               <Label>Third-party Domains (comma separated)</Label>
               <Input 
                 placeholder="e.g. _spf.google.com, sendgrid.net" 
                 value={includes} 
                 onChange={e => setIncludes(e.target.value)} 
                 className="mt-1"
               />
               <p className="text-xs text-muted-foreground mt-1">Authorized third-party sending domains (include)</p>
             </div>
          </div>
          <div className="space-y-4">
             <Label>Enforcement Policy (Qualifier)</Label>
             <Select value={qualifier} onValueChange={setQualifier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-all">Fail (-all) — Reject unauthorized emails (Recommended)</SelectItem>
                  <SelectItem value="~all">SoftFail (~all) — Accept but mark as spam</SelectItem>
                  <SelectItem value="?all">Neutral (?all) — Treat as neither pass nor fail</SelectItem>
                  <SelectItem value="+all">Pass (+all) — Allow any server to send (DANGEROUS)</SelectItem>
                </SelectContent>
             </Select>
          </div>
        </Card>
        <div>
          <Card className="p-6 md:sticky md:top-20 bg-primary/5 border-primary/20">
            <h3 className="font-semibold text-lg mb-4">Generated SPF Record</h3>
            <div className="p-4 bg-background rounded-md border font-mono text-sm break-all mb-4">
              {result}
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Host/Name: <code>@</code> or empty</p>
              <CopyButton data={result} text="Copy Record" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}