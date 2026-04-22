import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface SuperToolSearchProps {
  className?: string;
  autoFocus?: boolean;
}

export function SuperToolSearch({ className = "relative w-full max-w-2xl", autoFocus = false }: SuperToolSearchProps) {
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
      navigate(`/network/url-scanner?q=${encodeURIComponent(q)}`)
      return
    }

    // Auto-detect Email
    if (q.includes('@')) {
      const parts = q.split('@');
      const domain = parts[parts.length - 1];
      if (domain) {
        navigate(`/health/deliverability?q=${encodeURIComponent(domain)}`)
        return
      }
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
    <form onSubmit={handleSearch} className={className}>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="SuperTool: Enter a domain, IP, URL, or Email..."
        className="w-full bg-background pl-8 shadow-none"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus={autoFocus}
      />
    </form>
  )
}
