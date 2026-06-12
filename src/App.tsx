import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { DNSLookupPage } from "@/components/tools/DNSLookupPage"
import { DNSSECLookupPage } from "@/components/tools/DNSSECLookupPage"
import { EmailAuthPage } from "@/components/tools/EmailAuthPage"
import { RegistrationLookupPage } from "@/components/tools/RegistrationLookupPage"
import { MyIpPage } from "@/components/tools/MyIpPage"
import { HttpLookupPage } from "@/components/tools/HttpLookupPage"
import { UrlScannerPage } from "@/components/tools/UrlScannerPage"
import { DomainHealthPage } from "@/components/tools/DomainHealthPage"
import { CertLookupPage } from "@/components/tools/CertLookupPage"
import { BlacklistPage } from "@/components/tools/BlacklistPage"
import { EmailHeaderAnalyzerPage } from "@/components/tools/EmailHeaderAnalyzerPage"
import { SubnetCalculatorPage } from "@/components/tools/SubnetCalculatorPage"
import { SpfGeneratorPage } from "@/components/tools/SpfGeneratorPage"
import { DmarcGeneratorPage } from "@/components/tools/DmarcGeneratorPage"
import { EmailDeliverabilityPage } from "@/components/tools/EmailDeliverabilityPage"
import { SubdomainScannerPage } from "@/components/tools/SubdomainScannerPage"
import { CodeGeneratorPage } from "@/components/tools/CodeGeneratorPage"
import { CodeScannerPage } from "@/components/tools/CodeScannerPage"
import { MacLookupPage } from "@/components/tools/MacLookupPage"
import { SuperToolSearch } from "@/components/shared/SuperToolSearch"
import { NetworkVisualizer } from "@/components/tools/NetworkVisualizer"
import { CreditsPage } from "@/components/tools/CreditsPage"
import { AboutPage } from "@/components/tools/AboutPage"
import { AllFeaturesPage } from "@/components/tools/AllFeaturesPage"
import { ReverseDnsPage } from "@/components/tools/ReverseDnsPage"
import { DomainReputationPage } from "@/components/tools/DomainReputationPage"
import { ThreatIntelPage } from "@/components/tools/ThreatIntelPage"
import { SEO } from "@/components/shared/SEO"
import { Info, Globe, Cpu, ShieldCheck } from "lucide-react"
function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={
            <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-10rem)] text-center px-4 max-w-4xl mx-auto py-8">
              <SEO
                url="https://tools.noob31.com/"
                jsonLd={JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "WebApplication",
                  "name": "Noob31's MultiTools",
                  "description": "A comprehensive toolkit for network diagnostics, domain health, email authentication, and security analysis.",
                  "url": "https://tools.noob31.com/",
                  "applicationCategory": "UtilitiesApplication",
                  "operatingSystem": "All"
                })}
              />

              <div className="space-y-2 mb-6">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-brand font-black tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/80 bg-clip-text">
                  Noob31's MultiTools.
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  This is my toolkit for domain health, network diagnostics, and email authentication.
                </p>
              </div>

              <div className="w-full max-w-2xl mb-6 shadow-md rounded-xl overflow-hidden border border-border/60">
                <SuperToolSearch className="relative w-full" autoFocus={true} />
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground/80 mb-8 max-w-lg">
                Or select a specific tool from the sidebar. Clicking on the logo brings you back here.
              </p>

              <div className="grid gap-4 w-full max-w-2xl mb-8">
                {/* Privacy & Trust Banner */}
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 text-xs text-muted-foreground flex flex-col sm:flex-row items-center gap-3 text-left">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-500 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <p className="leading-relaxed">
                    All tools here run fully in the browser. No tracking or metrics info is collected. This project is open source. Check out the source for yourself below.
                  </p>
                </div>

                {/* Links Row */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/about/info"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border/80 hover:bg-muted/50 hover:border-border text-sm font-semibold transition-all hover:text-foreground text-muted-foreground"
                  >
                    <Info className="w-4 h-4" />
                    About
                  </Link>
                  <a
                    href="https://noob31.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border/80 hover:bg-muted/50 hover:border-border text-sm font-semibold transition-all hover:text-foreground text-muted-foreground"
                  >
                    <Globe className="w-4 h-4" />
                    My Website
                  </a>
                  <a
                    href="https://github.com/Noob31Gen/noob31-multitool"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border/80 hover:bg-muted/50 hover:border-border text-sm font-semibold transition-all hover:text-foreground text-muted-foreground"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                    GitHub
                  </a>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5 justify-center">
                <Cpu className="w-3.5 h-3.5" />
                <span>This project is built with React.js, Vite, and Tailwind CSS.</span>
              </div>
            </div>
          } />
          <Route path="/dns/:type" element={<DNSLookupPage />} />
          <Route path="/dnssec/:type" element={<DNSSECLookupPage />} />
          <Route path="/email/:type" element={<EmailAuthPage />} />
          <Route path="/registration/:tool" element={<RegistrationLookupPage />} />
          <Route path="/network/url-scanner" element={<UrlScannerPage />} />
          <Route path="/network/subdomains" element={<SubdomainScannerPage />} />
          <Route path="/network/reverse-dns" element={<ReverseDnsPage />} />
          <Route path="/network/my-ip" element={<MyIpPage />} />
          <Route path="/network/mac-lookup" element={<MacLookupPage />} />
          <Route path="/network/http/:scheme" element={<HttpLookupPage />} />
          <Route path="/health/domain" element={<DomainHealthPage />} />
          <Route path="/health/deliverability" element={<EmailDeliverabilityPage />} />
          <Route path="/security/cert" element={<CertLookupPage />} />
          <Route path="/security/blacklist" element={<BlacklistPage />} />
          <Route path="/security/domain-reputation" element={<DomainReputationPage />} />
          <Route path="/security/threat-intel" element={<ThreatIntelPage />} />
          <Route path="/bonus/headers" element={<EmailHeaderAnalyzerPage />} />
          <Route path="/bonus/subnet" element={<SubnetCalculatorPage />} />
          <Route path="/bonus/spf-generator" element={<SpfGeneratorPage />} />
          <Route path="/bonus/dmarc-generator" element={<DmarcGeneratorPage />} />
          <Route path="/bonus/code-generator" element={<CodeGeneratorPage />} />
          <Route path="/bonus/code-scanner" element={<CodeScannerPage />} />
          <Route path="/bonus/visualizer" element={<NetworkVisualizer />} />
          <Route path="/about/info" element={<AboutPage />} />
          <Route path="/about/credits" element={<CreditsPage />} />

          <Route path="/about/features" element={<AllFeaturesPage />} />
          <Route path="*" element={<div className="p-10 text-center text-muted-foreground">Tool not found. Check the sidebar if you're lost.</div>} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}
export default App