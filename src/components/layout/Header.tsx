import { SettingsSheet } from "./SettingsSheet"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="SuperTool: Enter a domain, IP, or URL..."
            className="w-full bg-background pl-8 shadow-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <SettingsSheet />
      </div>
    </header>
  )
}
