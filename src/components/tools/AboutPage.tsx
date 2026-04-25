import { Card } from "@/components/ui/card"

export function AboutPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">About Me</h1>
      </div>

      <Card className="p-6 bg-muted/40 space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Noob31's MultiTools</h2>
          <p className="text-muted-foreground">
            I'm a Network Security Engineer. I made this abomination to reduce my own dependancy on <a href="https://mxtoolbox.com/" target="_blank" rel="noreferrer">MXToolbox</a> (which is fantastic btw). This is just a side project of mine.
          </p>
          <p className="text-muted-foreground">
            I have a lot of windows and web tools on my website. Check them out too. Also if something doesn't work, please let me know.
          </p>
        </div>

        <div className="pt-4 space-y-2">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Contact:</span> <a className="underline hover:text-foreground" href="mailto:welcome@noob31.com">welcome@noob31.com</a>
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Website:</span> <a className="underline hover:text-foreground" href="https://noob31.com/" target="_blank" rel="noreferrer">noob31.com</a>
          </p>
        </div>

        <div className="pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            This project is built with React.js, Vite, and Tailwind CSS.
          </p>
        </div>
      </Card>
    </div>
  )
}
