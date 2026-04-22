import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { DNSLookupPage } from "@/components/tools/DNSLookupPage"
import { DNSSECLookupPage } from "@/components/tools/DNSSECLookupPage"
import { EmailAuthPage } from "@/components/tools/EmailAuthPage"
import { RegistrationLookupPage } from "@/components/tools/RegistrationLookupPage"
import { MyIpPage } from "@/components/tools/MyIpPage"
import { HttpLookupPage } from "@/components/tools/HttpLookupPage"
import { UrlScannerPage } from "@/components/tools/UrlScannerPage"
import { DnsCheckPage } from "@/components/tools/DnsCheckPage"
import { DomainHealthPage } from "@/components/tools/DomainHealthPage"
import { CertLookupPage } from "@/components/tools/CertLookupPage"
import { BlacklistPage } from "@/components/tools/BlacklistPage"
import { EmailHeaderAnalyzerPage } from "@/components/tools/EmailHeaderAnalyzerPage"
import { SubnetCalculatorPage } from "@/components/tools/SubnetCalculatorPage"
import { SpfGeneratorPage } from "@/components/tools/SpfGeneratorPage"
import { DmarcGeneratorPage } from "@/components/tools/DmarcGeneratorPage"
import { EmailDeliverabilityPage } from "@/components/tools/EmailDeliverabilityPage"
import { SuperToolSearch } from "@/components/shared/SuperToolSearch"


function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Noob31's MultiTool</h1>
              <p className="text-lg text-muted-foreground mb-10 max-w-2xl">
                The ultimate toolkit for domain health, network diagnostics, and email authentication.
              </p>
              <div className="w-full max-w-3xl mb-8">
                <SuperToolSearch className="relative w-full" autoFocus={true} />
              </div>
              <p className="text-sm text-muted-foreground">
                Or select a specific tool from the sidebar.
              </p>
              <p className="text-sm text-muted-foreground">
                All tools here run fully in the browser.
              </p>
            </div>
          } />

          {/* Part 1: Core DNS Lookups */}
          <Route path="/dns/:type" element={<DNSLookupPage />} />

          {/* Part 2: DNSSEC Lookups */}
          <Route path="/dnssec/:type" element={<DNSSECLookupPage />} />

          {/* Part 3: Email Auth Lookups */}
          <Route path="/email/:type" element={<EmailAuthPage />} />

          {/* Part 4: Registration Lookups */}
          <Route path="/registration/:tool" element={<RegistrationLookupPage />} />

          {/* Part 5: Network Diagnostics */}
          <Route path="/network/url-scanner" element={<UrlScannerPage />} />
          <Route path="/network/my-ip" element={<MyIpPage />} />
          <Route path="/network/http/:scheme" element={<HttpLookupPage />} />

          {/* Part 5 & 9: DNS, Domain Health, Deliverability */}
          <Route path="/health/dns" element={<DnsCheckPage />} />
          <Route path="/health/domain" element={<DomainHealthPage />} />
          <Route path="/health/deliverability" element={<EmailDeliverabilityPage />} />

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
