import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SuperToolSearchProps {
  className?: string;
  autoFocus?: boolean;
}

export function SuperToolSearch({ className = "relative w-full max-w-2xl", autoFocus = false }: SuperToolSearchProps) {
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    const q = query.trim()

    // Auto-detect IP
    const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(q)
    if (isIp) {
      navigate(`/registration/arin`, { state: { target: q } })
      return
    }

    // Auto-detect URL
    if (q.startsWith('http://') || q.startsWith('https://')) {
      navigate(`/network/url-scanner`, { state: { target: q } })
      return
    }

    // Auto-detect Email
    if (q.includes('@')) {
      const parts = q.split('@');
      const domain = parts[parts.length - 1];
      if (domain) {
        navigate(`/health/deliverability`, { state: { target: domain } })
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
    navigate(`/health/domain`, { state: { target: parsedQ } })
  }

  return (
    <form onSubmit={handleSearch} className={className}>
      <div className="relative flex items-center w-full overflow-hidden rounded-md">
        <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground z-10" />
        <Input
          type="search"
          placeholder=""
          className="w-full bg-background pl-8 pr-20 shadow-none h-10 relative z-0"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus={autoFocus}
        />
        {!query && !isFocused && (
          <div className="absolute inset-y-0 left-8 right-20 flex items-center pointer-events-none overflow-hidden text-sm text-muted-foreground whitespace-nowrap z-10 select-none mask-image-fade">
            <div className="animate-marquee">
              MultiTool: Enter a domain, IP, URL, or Email...
            </div>
          </div>
        )}
        <Button
          type="submit"
          className="absolute right-1 h-8 px-3 text-xs font-medium bg-white text-black hover:bg-gray-100 border border-gray-200"
        >
          Lookup
        </Button>
      </div>
    </form>
  )
}
