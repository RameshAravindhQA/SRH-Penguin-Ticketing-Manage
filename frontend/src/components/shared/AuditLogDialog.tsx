import React from "react";
import { getListAuditLogsQueryKey, useListAuditLogs } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export function AuditLogDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  title,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  entityType: string;
  entityId: number | null;
  title: string;
}) {
  const params = entityId ? { entityType, entityId } : { entityType };
  const { data: logs, isLoading } = useListAuditLogs(
    params,
    { query: { enabled: open, queryKey: getListAuditLogsQueryKey(params) } },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-md border">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading audit logs...</div>
          ) : !logs?.length ? (
            <div className="p-8 text-center text-muted-foreground">No audit logs found.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "dd MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm">{log.userName || "-"}</TableCell>
                    <TableCell className="text-sm capitalize">{log.action.replace(/_/g, " ")}</TableCell>
                    <TableCell className="font-mono text-xs">{log.entityRef || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
