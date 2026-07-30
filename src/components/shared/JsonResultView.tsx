interface JsonResultViewProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  data?: unknown
  error?: string
  query?: string
  tool?: string
}

export function JsonResultView({ status, data, error, query, tool }: JsonResultViewProps) {
  let outputPayload: Record<string, unknown> = {}

  if (status === 'loading') {
    outputPayload = {
      status: "loading",
      tool: tool || "Tool",
      query: query || null
    }
  } else if (status === 'error') {
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

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 font-mono text-xs sm:text-sm overflow-x-auto border-none shadow-none">
      <pre className="whitespace-pre-wrap break-all">{jsonString}</pre>
    </div>
  )
}
