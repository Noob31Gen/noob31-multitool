import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { SettingsSheet } from "./SettingsSheet"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function Header() {
  const [query, setQuery] = useState("")
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    const q = query.trim()
    
    // Auto-detect IP
    const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(q)
    if (isIp) {
      navigate(`/registration/arin?q=${encodeURIComponent(q)}`)
      return
    }

    // Auto-detect URL
    if (q.startsWith('http://') || q.startsWith('https://')) {
      const scheme = q.startsWith('https://') ? 'https' : 'http'
      navigate(`/network/http/${scheme}?q=${encodeURIComponent(q)}`)
      return
    }

    // Extract hostname if path is included but no scheme matched (e.g. example.com/path)
    let parsedQ = q
    if (q.includes('/') && !isIp && !q.startsWith('http')) {
      try {
        const url = new URL(`https://${q}`)
        parsedQ = url.hostname
      } catch (e) {
        parsedQ = q.split('/')[0]
      }
    }

    // Default: Domain Health
    navigate(`/health/domain?q=${encodeURIComponent(parsedQ)}`)
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-1 items-center gap-4 pl-12 md:pl-0">
        <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="SuperTool: Enter a domain, IP, or URL..."
            className="w-full bg-background pl-8 shadow-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <SettingsSheet />
      </div>
    </header>
  )
}

