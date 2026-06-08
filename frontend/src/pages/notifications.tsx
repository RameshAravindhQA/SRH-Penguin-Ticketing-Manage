import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListNotifications } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { AlertCircle, Bell, BellRing, CheckCircle2, Search } from "lucide-react";
import { ModuleStats } from "@/components/shared/ModuleStats";
import { TableControls, usePagination } from "@/components/shared/TableControls";

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useListNotifications({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const allNotifications = notifications || [];
  const unread = allNotifications.filter(n => !n.isRead).length;
  const read = allNotifications.filter(n => n.isRead).length;
  const alerts = allNotifications.filter(n => n.type?.toLowerCase().includes("sla") || n.type?.toLowerCase().includes("breach")).length;
  const notificationTypes = useMemo(() => Array.from(new Set(allNotifications.map(n => n.type).filter(Boolean))).sort(), [allNotifications]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allNotifications.filter(notification => {
      if (status === "read" && !notification.isRead) return false;
      if (status === "unread" && notification.isRead) return false;
      if (type !== "all" && notification.type !== type) return false;
      if (!query) return true;
      return [
        notification.message,
        notification.type,
        notification.entityType,
        notification.entityRef,
        notification.entityId,
      ].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [allNotifications, search, status, type]);

  React.useEffect(() => setPage(1), [search, status, type, setPage]);

  const pageRows = paginate(filtered);
  const exportData = filtered.map(notification => ({
    Message: notification.message,
    Type: notification.type,
    Entity: notification.entityRef || notification.entityType || "-",
    Status: notification.isRead ? "Read" : "Unread",
    Created: format(new Date(notification.createdAt), "dd MMM yyyy HH:mm"),
  }));

  return (
    <AppLayout title="Notifications">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Notification Management</h2>
            <p className="text-sm text-muted-foreground">Maintain ticket, project, assignment, and system alerts in table view.</p>
          </div>
          <TableControls
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            showExport
            exportData={exportData}
            exportHeaders={["Message", "Type", "Entity", "Status", "Created"]}
            exportKeys={["Message", "Type", "Entity", "Status", "Created"]}
            exportFilename="notifications"
            exportTitle="Notifications"
          />
        </div>

        <ModuleStats
          stats={[
            { label: "Total", value: allNotifications.length, icon: Bell, tone: "sky" },
            { label: "Unread", value: unread, icon: BellRing, tone: "amber" },
            { label: "Read", value: read, icon: CheckCircle2, tone: "emerald" },
            { label: "Alerts", value: alerts, icon: AlertCircle, tone: "rose" },
          ]}
        />

        <Card className="rounded-md shadow-sm">
          <CardContent className="space-y-3 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search notification, type, entity..." className="h-9 pl-9" />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9 w-[210px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {notificationTypes.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Loading notifications...</TableCell></TableRow>
                  ) : pageRows.length ? (
                    pageRows.map((notification, index) => (
                      <TableRow key={notification.id} className={!notification.isRead ? "bg-primary/5" : undefined}>
                        <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                        <TableCell className="max-w-[520px]">
                          <div className="font-medium text-foreground">{notification.message}</div>
                          <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="uppercase">{notification.type}</Badge></TableCell>
                        <TableCell>{notification.entityRef || notification.entityType || "-"}</TableCell>
                        <TableCell>
                          <Badge className={notification.isRead ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                            {notification.isRead ? "Read" : "Unread"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{format(new Date(notification.createdAt), "dd MMM yyyy HH:mm")}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No notifications found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <TableControls
              total={filtered.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
