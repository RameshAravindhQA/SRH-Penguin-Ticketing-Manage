import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListAuditLogs } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { TableControls, usePagination } from "@/components/shared/TableControls";

function actionBadge(action: string) {
  const map: Record<string, string> = {
    create: "bg-green-100 text-green-700",
    update: "bg-blue-100 text-blue-700",
    delete: "bg-red-100 text-red-700",
    login: "bg-slate-100 text-slate-700",
    logout: "bg-slate-100 text-slate-600",
    assign: "bg-purple-100 text-purple-700",
    forward: "bg-orange-100 text-orange-700",
    status_change: "bg-amber-100 text-amber-700",
    pick: "bg-cyan-100 text-cyan-700",
  };
  return <Badge className={`border-0 text-[10px] uppercase font-bold ${map[action] || "bg-slate-100 text-slate-700"}`}>{action.replace("_", " ")}</Badge>;
}

export default function AuditLogsPage() {
  const { data: logs, isLoading } = useListAuditLogs({});
  const [search, setSearch] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(25);

  const filtered = useMemo(() => {
    let data = logs || [];
    if (entityTypeFilter !== "all") data = data.filter(l => l.entityType === entityTypeFilter);
    if (actionFilter !== "all") data = data.filter(l => l.action === actionFilter);
    if (fromDate) data = data.filter(l => l.createdAt >= fromDate);
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(l => l.userName?.toLowerCase().includes(s) || l.entityRef?.toLowerCase().includes(s) || l.action.includes(s));
    }
    return data;
  }, [logs, entityTypeFilter, actionFilter, fromDate, search]);

  const paged = paginate(filtered);

  const exportData = filtered.map(l => ({
    Timestamp: format(new Date(l.createdAt), "yyyy-MM-dd HH:mm:ss"),
    User: l.userName || "-", Action: l.action, "Entity Type": l.entityType,
    "Entity Ref": l.entityRef || "-", "IP Address": l.ipAddress || "-",
  }));
  const exportHeaders = ["Timestamp", "User", "Action", "Entity Type", "Entity Ref", "IP Address"];
  const exportKeys = exportHeaders;

  const entityTypes = [...new Set((logs || []).map(l => l.entityType).filter(Boolean))];
  const actions = [...new Set((logs || []).map(l => l.action).filter(Boolean))];

  return (
    <AppLayout title="Audit Logs">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">System Audit Trail</h2>
          <p className="text-muted-foreground text-sm">Complete history of all structural changes and critical actions.</p>
        </div>

        {/* Filters */}
        <Card className="border-slate-200">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search user, action, reference..." className="pl-9 h-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <Select value={entityTypeFilter} onValueChange={v => { setEntityTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Entity Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityTypes.map(t => <SelectItem key={t} value={t!} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map(a => <SelectItem key={a} value={a!} className="capitalize">{a?.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">From:</Label>
                <Input type="date" className="h-9 w-36" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} />
              </div>
              {(search || entityTypeFilter !== "all" || actionFilter !== "all" || fromDate) && (
                <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setSearch(""); setEntityTypeFilter("all"); setActionFilter("all"); setFromDate(""); setPage(1); }}>
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading audit logs...</div>
            ) : !paged.length ? (
              <div className="p-12 text-center text-muted-foreground">No logs match your filters.</div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((log, i) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground text-sm">{(page - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs font-mono text-muted-foreground">
                        {format(new Date(log.createdAt), "dd MMM yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{log.userName || "-"}</TableCell>
                      <TableCell>{actionBadge(log.action)}</TableCell>
                      <TableCell className="capitalize text-sm text-muted-foreground">{log.entityType}</TableCell>
                      <TableCell className="font-mono text-xs">{log.entityRef || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.ipAddress || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <TableControls
            total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}
            exportData={exportData} exportHeaders={exportHeaders} exportKeys={exportKeys}
            exportFilename="audit-logs" exportTitle="Audit Log Report"
          />
        </Card>
      </div>
    </AppLayout>
  );
}
