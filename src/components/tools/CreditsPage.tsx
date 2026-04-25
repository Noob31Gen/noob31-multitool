import { Card } from "@/components/ui/card"

export function CreditsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Credits</h1>
        <p className="text-muted-foreground mt-2">Special thanks to the following APIs and services that power this project.</p>
      </div>

      <Card className="p-6 bg-muted/40 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Subdomain Enumeration</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li><a href="https://api.hackertarget.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">HackerTarget</a></li>
            <li><a href="https://urlscan.io/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">urlscan.io</a></li>
            <li><a href="https://crt.sh/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">crt.sh</a></li>
            <li><a href="https://api.certspotter.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">CertSpotter</a></li>
            <li><a href="https://jldc.me/anubis/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Anubis by jldc.me</a></li>
            <li><a href="https://api.mnemonic.no/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Mnemonic PassiveDNS</a></li>
            <li><a href="https://tls.bufferover.run/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">BufferOver.run</a></li>
            <li><a href="http://web.archive.org/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Wayback Machine / Internet Archive</a></li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">RDAP & DNS</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li><a href="https://rdap.org/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">RDAP.org</a></li>
            <li><a href="https://dns.google/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Google DNS</a></li>
            <li><a href="https://cloudflare-dns.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Cloudflare DNS</a></li>
            <li><a href="https://dns.alidns.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">AliDNS</a></li>
            <li><a href="https://dns.adguard-dns.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">AdGuard DNS</a></li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">ASN Lookup</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li><a href="https://api.ipapi.is/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">ipapi.is</a></li>
            <li><a href="https://stat.ripe.net/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">RIPE stat</a></li>
            <li><a href="https://www.peeringdb.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">PeeringDB</a></li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">CORS Proxies</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li><a href="https://api.allorigins.win/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">AllOrigins</a></li>
            <li><a href="https://api.codetabs.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">CodeTabs</a></li>
            <li><a href="https://thingproxy.freeboard.io/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">ThingProxy</a></li>
            <li><a href="https://cors-anywhere.herokuapp.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Cors-Anywhere</a></li>
            <li><a href="https://corsproxy.io/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Corsproxy.io</a></li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
