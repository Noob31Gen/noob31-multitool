import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DNSRecord } from "@/lib/doh"

interface DNSResultTableProps {
  records: DNSRecord[]
}

export function DNSResultTable({ records }: DNSResultTableProps) {
  if (!records || records.length === 0) {
    return <div className="text-sm text-muted-foreground p-4 text-center border rounded-md">No records found.</div>
  }

  return (
    <div className="w-full min-w-0">
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead>Domain Name</TableHead>
              <TableHead className="w-[80px]">TTL</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium ring-1 ring-inset ring-border">
                    {record.typeName}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs">{record.name}</TableCell>
                <TableCell className="text-muted-foreground">{record.TTL}</TableCell>
                <TableCell className="font-mono text-xs break-all">
                  {record.data}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card/Box View */}
      <div className="md:hidden space-y-4">
        {records.map((record, i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
              <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ring-primary/20">
                {record.typeName}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">TTL: {record.TTL}</span>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-tight">Domain Name</p>
                <p className="text-xs font-mono break-all">{record.name}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-tight">Record Value</p>
                <div className="p-3 bg-muted/50 rounded-lg border border-border/50 font-mono text-xs break-all leading-relaxed text-foreground/90">
                  {record.data}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
