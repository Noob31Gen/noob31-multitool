import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { DNSLookupPage } from "@/components/tools/DNSLookupPage"
import { DNSSECLookupPage } from "@/components/tools/DNSSECLookupPage"
import { EmailAuthPage } from "@/components/tools/EmailAuthPage"
import { RegistrationLookupPage } from "@/components/tools/RegistrationLookupPage"
import { MyIpPage } from "@/components/tools/MyIpPage"
import { HttpLookupPage } from "@/components/tools/HttpLookupPage"
import { DnsCheckPage } from "@/components/tools/DnsCheckPage"
import { DomainHealthPage } from "@/components/tools/DomainHealthPage"
import { CertLookupPage } from "@/components/tools/CertLookupPage"
import { BlacklistPage } from "@/components/tools/BlacklistPage"
import { EmailHeaderAnalyzerPage } from "@/components/tools/EmailHeaderAnalyzerPage"
import { SubnetCalculatorPage } from "@/components/tools/SubnetCalculatorPage"
import { SpfGeneratorPage } from "@/components/tools/SpfGeneratorPage"
import { DmarcGeneratorPage } from "@/components/tools/DmarcGeneratorPage"

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<div className="text-center py-20"><h1 className="text-4xl font-bold mb-4">Welcome to URL Scanner</h1><p className="text-muted-foreground">Select a tool from the sidebar or use the SuperTool search above.</p></div>} />
          
          {/* Part 1: Core DNS Lookups */}
          <Route path="/dns/a" element={<DNSLookupPage defaultType="A" title="A Record Lookup" description="Check IPv4 address (A records) for a domain." />} />
          <Route path="/dns/aaaa" element={<DNSLookupPage defaultType="AAAA" title="AAAA Record Lookup" description="Check IPv6 address (AAAA records) for a domain." />} />
          <Route path="/dns/cname" element={<DNSLookupPage defaultType="CNAME" title="CNAME Lookup" description="Check canonical name (alias) records for a domain." />} />
          <Route path="/dns/mx" element={<DNSLookupPage defaultType="MX" title="MX Lookup" description="Check Mail Exchange (MX) records to see where email is routed." />} />
          <Route path="/dns/txt" element={<DNSLookupPage defaultType="TXT" title="TXT Lookup" description="Check Text (TXT) records used for SPF, verification, and more." />} />
          <Route path="/dns/soa" element={<DNSLookupPage defaultType="SOA" title="SOA Lookup" description="Check Start of Authority (SOA) records." />} />
          <Route path="/dns/ns" element={<DNSLookupPage defaultType="NS" title="NS Lookup" description="Check Name Server (NS) records for a domain." />} />
          <Route path="/dns/srv" element={<DNSLookupPage defaultType="SRV" title="SRV Lookup" description="Check Service locator (SRV) records." />} />
          <Route path="/dns/loc" element={<DNSLookupPage defaultType="LOC" title="LOC Lookup" description="Check Location (LOC) records." />} />
          <Route path="/dns/ptr" element={<DNSLookupPage defaultType="PTR" title="Reverse Lookup (PTR)" description="Check the hostname associated with an IP address." />} />

          {/* Part 2: DNSSEC Lookups */}
          <Route path="/dnssec/dnskey" element={<DNSSECLookupPage defaultType="DNSKEY" title="DNSKEY Lookup" description="Check DNSSEC signing keys for a domain." />} />
          <Route path="/dnssec/ds" element={<DNSSECLookupPage defaultType="DS" title="DS Lookup" description="Check Delegation Signer (DS) records for a domain." />} />
          <Route path="/dnssec/nsec" element={<DNSSECLookupPage defaultType="NSEC" title="NSEC Lookup" description="Check Next Secure (NSEC) records for a domain." />} />
          <Route path="/dnssec/nsec3param" element={<DNSSECLookupPage defaultType="NSEC3PARAM" title="NSEC3PARAM Lookup" description="Check NSEC3 parameters for a domain." />} />
          <Route path="/dnssec/rrsig" element={<DNSSECLookupPage defaultType="RRSIG" title="RRSIG Lookup" description="Check DNSSEC signatures for a domain." />} />

          {/* Part 3: Email Auth Lookups */}
          <Route path="/email/spf" element={<EmailAuthPage defaultType="SPF" title="SPF Record Lookup" description="Check Sender Policy Framework records to prevent email spoofing." />} />
          <Route path="/email/dkim" element={<EmailAuthPage defaultType="DKIM" title="DKIM Record Lookup" description="Check DomainKeys Identified Mail records." />} />
          <Route path="/email/dmarc" element={<EmailAuthPage defaultType="DMARC" title="DMARC Record Lookup" description="Check Domain-based Message Authentication, Reporting, and Conformance records." />} />
          <Route path="/email/bimi" element={<EmailAuthPage defaultType="BIMI" title="BIMI Record Lookup" description="Check Brand Indicators for Message Identification records." />} />
          <Route path="/email/mta-sts" element={<EmailAuthPage defaultType="MTA-STS" title="MTA-STS Record Lookup" description="Check Mail Transfer Agent Strict Transport Security records." />} />
          <Route path="/email/tlsrpt" element={<EmailAuthPage defaultType="TLSRPT" title="TLS Reporting Lookup" description="Check TLS Reporting records." />} />

          {/* Part 4: Registration Lookups */}
          <Route path="/registration/whois" element={<RegistrationLookupPage tool="WHOIS" title="WHOIS Lookup" description="Check RDAP registration data for a domain." />} />
          <Route path="/registration/arin" element={<RegistrationLookupPage tool="ARIN" title="ARIN IP Lookup" description="Check RDAP registration data for an IP address." />} />
          <Route path="/registration/asn" element={<RegistrationLookupPage tool="ASN" title="ASN Lookup" description="Check Autonomous System Number data using IPinfo." />} />

          {/* Part 5: Network Diagnostics */}
          <Route path="/network/my-ip" element={<MyIpPage />} />
          <Route path="/network/http" element={<HttpLookupPage scheme="http" />} />
          <Route path="/network/https" element={<HttpLookupPage scheme="https" />} />
          <Route path="/network/ipseckey" element={<DNSLookupPage defaultType="IPSECKEY" title="IPSECKEY Lookup" description="Check IPSECKEY records for opportunistic encryption." />} />

          {/* Part 5: DNS & Domain Health */}
          <Route path="/health/dns" element={<DnsCheckPage />} />
          <Route path="/health/domain" element={<DomainHealthPage />} />

          {/* Part 7: Security & Blacklist */}
          <Route path="/security/cert" element={<CertLookupPage />} />
          <Route path="/security/blacklist" element={<BlacklistPage />} />

          {/* Part 8: Bonus Tools */}
          <Route path="/bonus/headers" element={<EmailHeaderAnalyzerPage />} />
          <Route path="/bonus/subnet" element={<SubnetCalculatorPage />} />
          <Route path="/bonus/spf-generator" element={<SpfGeneratorPage />} />
          <Route path="/bonus/dmarc-generator" element={<DmarcGeneratorPage />} />

          <Route path="*" element={<div className="p-10 text-center text-muted-foreground">Component coming soon...</div>} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
