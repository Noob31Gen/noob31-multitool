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
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Domain Name</TableHead>
            <TableHead>TTL</TableHead>
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
              <TableCell>{record.name}</TableCell>
              <TableCell>{record.TTL}</TableCell>
              <TableCell className="font-mono text-xs break-all">
                {record.data}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
