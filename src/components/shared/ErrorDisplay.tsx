import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, AlertTriangle, RefreshCw } from "lucide-react"

interface ErrorDisplayProps {
  title?: string
  error?: string | Error
  suggestion?: React.ReactNode
  onRetry?: () => void
  cardWrap?: boolean
}

export function ErrorDisplay({
  title = "Lookup Failed",
  error,
  suggestion,
  onRetry,
  cardWrap = true
}: ErrorDisplayProps) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : "An unexpected error occurred.";

  const innerContent = (
    <div className="space-y-4">
      {/* Error Details Box */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-destructive/20 bg-destructive/5 dark:bg-destructive/10/50 text-sm">
        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-destructive text-xs uppercase tracking-wider">Error Details</p>
          <p className="font-mono text-xs text-muted-foreground break-all leading-relaxed">{message}</p>
        </div>
      </div>
      
      {/* Suggestions Box */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10/50 text-sm">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-foreground/80 leading-relaxed flex-1">
          <p className="font-semibold text-amber-600 dark:text-amber-500 text-xs uppercase tracking-wider">Troubleshooting Suggestions</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>{suggestion || "Please check network connectivity or your proxy settings."}</div>
            <p className="mt-1">
              If it still doesn't work after some attempts, you can{" "}
              <a
                href="https://noob31.com/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline font-medium hover:text-primary/80"
              >
                contact support
              </a>{" "}
              to send me a message.
            </p>
          </div>
        </div>
      </div>

      {/* Optional Retry Button */}
      {onRetry && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Request
          </button>
        </div>
      )}
    </div>
  )

  if (cardWrap) {
    return (
      <Card className="w-full border-destructive/20 shadow-md">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-lg font-semibold text-destructive flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {innerContent}
        </CardContent>
      </Card>
    )
  }

  return innerContent;
}
