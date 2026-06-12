import { Card } from "@/components/ui/card"
import { SEO } from "@/components/shared/SEO"
export function CreditsPage() {
  return (
    <div className="space-y-6">
      <SEO
        title="Credits & Data Sources"
        description="A list of APIs, services, and libraries that power Noob31's MultiTools. Special thanks to all the providers."
        url="https://tools.noob31.com/about/credits"
      />
      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">Credits</h1>
        <p className="text-muted-foreground mt-2">Special thanks to the following APIs and services that power this project.</p>
      </div>
      <Card className="p-6 bg-muted/40 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Subdomain Enumeration & Certificates</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li><a href="https://api.hackertarget.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">HackerTarget</a></li>
            <li><a href="https://urlscan.io/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">urlscan.io</a></li>
            <li><a href="https://crt.sh/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">crt.sh</a></li>
            <li><a href="https://api.certspotter.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">CertSpotter</a></li>
            <li><a href="https://censys.io/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Censys Certificates Search</a></li>
            <li><a href="https://jldc.me/anubis/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Anubis by jldc.me</a></li>
            <li><a href="https://api.mnemonic.no/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Mnemonic PassiveDNS</a></li>
            <li><a href="https://tls.bufferover.run/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">BufferOver.run</a></li>
            <li><a href="http://web.archive.org/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Wayback Machine / Internet Archive</a></li>
            <li><a href="https://otx.alienvault.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">AlienVault OTX (Passive DNS)</a></li>
            <li><a href="https://www.threatminer.org/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">ThreatMiner</a></li>
            <li><a href="https://subdomain.center/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Subdomain Center</a></li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">RDAP, WHOIS & DNS</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li><a href="https://rdap.org/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">RDAP.org</a></li>
            <li><a href="https://github.com/lissy93/who-dat" target="_blank" rel="noreferrer" className="underline hover:text-foreground">who-dat WHOIS/RDAP Fallback API</a></li>
            <li><a href="https://dns.google/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Google DNS (DoH JSON & Wire Format)</a></li>
            <li><a href="https://cloudflare-dns.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Cloudflare DNS</a></li>
            <li><a href="https://dns.alidns.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">AliDNS</a></li>
            <li><a href="https://dns.adguard-dns.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">AdGuard DNS</a></li>
            <li><a href="https://www.quad9.net/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Quad9 DNS (Threat Blocking Resolving)</a></li>
            <li><a href="https://www.opendns.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">OpenDNS</a></li>
            <li>RIR Registries: <a href="https://www.arin.net/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">ARIN</a>, <a href="https://www.ripe.net/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">RIPE</a>, <a href="https://www.apnic.net/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">APNIC</a>, <a href="https://www.lacnic.net/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">LACNIC</a>, <a href="https://afrinic.net/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">AFRINIC</a></li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">ASN & IP Location Fallbacks</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li><a href="https://api.ipapi.is/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">ipapi.is</a></li>
            <li><a href="https://stat.ripe.net/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">RIPE stat</a></li>
            <li><a href="https://www.peeringdb.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">PeeringDB</a></li>
            <li><a href="https://ipwhois.app/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">ipwhois.app</a></li>
            <li><a href="https://ip-api.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">ip-api.com</a></li>
            <li><a href="https://bgpview.io/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">BGPView</a></li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Domain Blocklists & Reputation</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li><a href="https://www.spamhaus.org/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Spamhaus DBL</a></li>
            <li><a href="https://www.surbl.org/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">SURBL</a></li>
            <li><a href="https://www.uribl.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">URIBL</a></li>
            <li><a href="https://otx.alienvault.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">AlienVault OTX Threat Pulses</a></li>
            <li><a href="https://www.threatminer.org/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">ThreatMiner Passive Malware Database</a></li>
            <li><a href="https://safebrowsing.google.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Google Safe Browsing</a></li>
            <li><a href="https://www.virustotal.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">VirusTotal v3 API</a></li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">MAC Address & OUI</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li><a href="https://www.macvendorlookup.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">MACVendorLookup.com</a></li>
            <li><a href="https://maclookup.app/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">maclookup.app</a></li>
            <li><a href="https://macvendors.com/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">MacVendors.com</a></li>
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
        <div>
          <h2 className="text-lg font-semibold mb-3">Title Font</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li><a href="https://fonts.google.com/specimen/Pacifico" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Pacifico</a></li>
          </ul>
        </div>
      </Card>
    </div>
  )
}