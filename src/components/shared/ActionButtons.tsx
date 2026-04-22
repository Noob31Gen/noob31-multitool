import { Button } from "@/components/ui/button"
import { Copy, Download } from "lucide-react"
import { toast } from "sonner"

export function CopyButton({ data, text = "Copy" }: { data: string, text?: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data)
      toast.success("Copied to clipboard")
    } catch (err) {
      toast.error("Failed to copy")
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      <Copy className="mr-2 h-4 w-4" />
      {text}
    </Button>
  )
}

export function ExportButton({ data, filename, text = "Export JSON" }: { data: any, filename: string, text?: string }) {
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("File downloaded")
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      {text}
    </Button>
  )
}
