import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ResultCardProps {
  title: string
  description?: string
  status?: 'success' | 'error' | 'loading' | 'idle'
  timeMs?: number
  children: React.ReactNode
  action?: React.ReactNode
}

export function ResultCard({ title, description, status, timeMs, children, action }: ResultCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            {title}
            {status === 'success' && <Badge variant="default" className="bg-green-500 hover:bg-green-600">Success</Badge>}
            {status === 'error' && <Badge variant="destructive">Error</Badge>}
            {status === 'loading' && <Badge variant="secondary">Running...</Badge>}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          {timeMs !== undefined && <span className="text-xs text-muted-foreground">{timeMs} ms</span>}
          {action}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}
