import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, CheckCircle, XCircle, AlertTriangle, HelpCircle } from "lucide-react"
import { useState } from "react"

export type HealthStatus = 'pass' | 'fail' | 'warn' | 'info';

interface HealthReportItemProps {
  title: string;
  status: HealthStatus;
  message: string;
  details?: React.ReactNode;
}

export function HealthItem({ title, status, message, details }: HealthReportItemProps) {
  const [open, setOpen] = useState(false);

  const StatusIcon = {
    pass: <CheckCircle className="w-5 h-5 text-green-500" />,
    fail: <XCircle className="w-5 h-5 text-destructive" />,
    warn: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <HelpCircle className="w-5 h-5 text-blue-500" />,
  }[status];

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-md mb-2 bg-card">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {StatusIcon}
          <div>
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
        </div>
        {details && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        )}
      </div>
      {details && (
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t mt-2">
            {details}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}
