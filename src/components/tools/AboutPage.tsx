import { Card } from "@/components/ui/card"
import { SEO } from "@/components/shared/SEO"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Mail, Globe, Info, Cpu, HelpCircle } from "lucide-react"

const version = import.meta.env.APP_VERSION;

export function AboutPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <SEO
        title="About Noob31's MultiTools"
        description="Learn more about the developer and the motivation behind this network security toolkit."
        url="https://tools.noob31.com/about/info"
      />
      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">About Me</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Bio / Info */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 bg-card border-border/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Info className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Noob31's MultiTools</h2>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              I'm a Network Security Engineer. I made this abomination to reduce my own dependency on <a href="https://mxtoolbox.com/" target="_blank" rel="noreferrer" className="text-primary underline hover:text-primary/80 inline-flex items-center gap-0.5">MXToolbox <ExternalLink className="w-3 h-3" /></a> (which is fantastic btw). This is just a side project of mine.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              I have a lot of windows and web tools on my website. Check them out too. Also if something doesn't work, please let me know.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This project is open source. The source code is below.
            </p>

            <div className="pt-4 border-t border-border/50 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">How-to's and FAQ:</h2>
              </div>

              <div className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
                <p>Pretty simple. Search and see results.</p>

                <p>
                  If you don't see results, it means you either need to add or remove CORS proxy configuration in settings.
                  Browser side limitations apply to tools and some free APIs have restrictions on daily use.
                </p>

                <p>
                  Search queries run only in-browser. Alternatively use the <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs font-medium text-foreground border border-border/50">?q=</code> tag in the url to query a tool directly.
                </p>

                <p>
                  Most results are available in UI or in JSON format. Alternatively use the <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs font-medium text-foreground border border-border/50">?output=json</code> tag to get results directly as JSON.
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-border/50 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-muted-foreground">Find more tools by me and others here: &nbsp;</span>
              <div className="flex gap-2">
                <a
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors border"
                  href="https://noob31.com/webtools"
                  target="_blank"
                  rel="noreferrer"
                >
                  Web Tools <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
                <a
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors border"
                  href="https://noob31.com/selfhost"
                  target="_blank"
                  rel="noreferrer"
                >
                  My SelfHosted <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Meta & Contact */}
        <div className="space-y-6">
          <Card className="p-6 bg-card border-border/80 shadow-sm space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Release Metadata</span>
              <div className="flex justify-between items-center py-2 border-y border-border/40">
                <span className="text-xs font-medium text-muted-foreground">App Version</span>
                <Badge variant="secondary" className="font-mono text-[10px] font-bold">
                  {version || "v1.2.6b"}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Contacts & Links</span>
              <div className="space-y-2.5">
                <a
                  href="mailto:welcome@noob31.com"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors text-xs text-muted-foreground hover:text-foreground group"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-semibold text-foreground">Contact</span>
                  </div>
                  <span className="font-mono text-[11px] underline">welcome@noob31.com</span>
                </a>

                <a
                  href="https://noob31.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors text-xs text-muted-foreground hover:text-foreground group"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-semibold text-foreground">Website</span>
                  </div>
                  <span className="font-mono text-[11px] underline flex items-center gap-0.5">noob31.com <ExternalLink className="w-3 h-3" /></span>
                </a>

                <a
                  href="https://github.com/Noob31Gen/noob31-multitool"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors text-xs text-muted-foreground hover:text-foreground group"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors fill-current" viewBox="0 0 24 24">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                    <span className="font-semibold text-foreground">Source</span>
                  </div>
                  <span className="font-mono text-[11px] underline flex items-center gap-0.5">Github <ExternalLink className="w-3 h-3" /></span>
                </a>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-4 bg-muted/20 border-border/40 text-xs flex items-center gap-2 text-muted-foreground">
        <Cpu className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span>This project is built with React.js, Vite, and Tailwind CSS.</span>
      </Card>
    </div>
  )
}