import { useEffect } from 'react'

interface JsonResultViewProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  data?: unknown
  error?: string
  query?: string
  tool?: string
}

export function JsonResultView({ status, data, error, query, tool }: JsonResultViewProps) {
  const isLoading = status === 'loading' || (status === 'idle' && Boolean(query))

  let outputPayload: Record<string, unknown> = {}

  if (status === 'error') {
    outputPayload = {
      status: "error",
      tool: tool || "Tool",
      query: query || null,
      error: error || "An error occurred"
    }
  } else if (status === 'success') {
    outputPayload = {
      status: "success",
      tool: tool || "Tool",
      query: query || null,
      data: data !== undefined ? data : null
    }
  } else {
    outputPayload = {
      status: "idle",
      tool: tool || "Tool",
      query: query || null,
      message: "No query specified. Provide a search parameter (e.g. ?q=example.com) to execute."
    }
  }

  const jsonString = JSON.stringify(outputPayload, null, 2)

  useEffect(() => {
    if (!isLoading) {
      try {
        const blob = new Blob([jsonString], { type: 'application/json' })
        const blobUrl = URL.createObjectURL(blob)
        window.location.replace(blobUrl)
      } catch {
        window.location.replace(`data:application/json;charset=utf-8,${encodeURIComponent(jsonString)}`)
      }
    }
  }, [isLoading, jsonString])

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center font-mono text-sm text-muted-foreground">
        loading...
      </div>
    )
  }

  return (
    <pre style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap', margin: 0 }}>
      {jsonString}
    </pre>
  )
}

