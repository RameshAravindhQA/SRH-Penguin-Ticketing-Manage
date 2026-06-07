import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListAuditLogs } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function AuditLogsPage() {
  const { data: logs, isLoading } = useListAuditLogs({});

  return (
    <AppLayout title="Audit Logs">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">System Audit Logs</h2>
          <p className="text-muted-foreground text-sm">Track all structural changes and critical actions across the system.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading logs...</div>
            ) : !logs || logs.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No audit logs found.</div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground font-mono">
                        {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-medium">{log.userName}</TableCell>
                      <TableCell>
                        <span className="uppercase text-[10px] font-bold tracking-wider bg-slate-100 px-2 py-1 rounded">
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-muted-foreground">{log.entityType}</span>
                        {log.entityRef && <span className="ml-1 font-mono text-xs">{log.entityRef}</span>}
                      </TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate text-muted-foreground">
                        {log.newValue ? "Values updated" : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
