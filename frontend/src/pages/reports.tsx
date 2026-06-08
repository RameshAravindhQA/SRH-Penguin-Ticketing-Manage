import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useListCalendarEvents, useListProjects, useListTickets, useListTimesheets, useListTodos, useListUsers } from "@workspace/api-client-react";
import { ExportMenu, TableControls, usePagination } from "@/components/shared/TableControls";

type ReportRow = { module: string; ref: string; title: string; status: string; owner: string; date: string; priority: string };

export default function ReportsPage() {
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [search, setSearch] = React.useState("");
  const { data: tickets } = useListTickets({});
  const { data: projects } = useListProjects({});
  const { data: todos } = useListTodos({});
  const { data: reminders } = useListCalendarEvents({});
  const { data: timesheets } = useListTimesheets({});
  const { data: users } = useListUsers();
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const rows: ReportRow[] = [
    ...(tickets || []).map(t => ({ module: "Ticket", ref: t.ticketNo, title: t.subject, status: t.status, owner: t.assignedToName || t.createdByName || "-", date: t.createdAt, priority: t.priority })),
    ...(projects || []).map(p => ({ module: "Project", ref: p.projectNo, title: p.title, status: p.status, owner: p.ownerName || "-", date: p.createdAt, priority: p.priority })),
    ...(todos || []).map(t => ({ module: "To-Do", ref: String(t.id), title: t.title, status: t.status, owner: t.assignedToName || "-", date: t.createdAt, priority: t.priority })),
    ...(reminders || []).map(r => ({ module: "Reminder", ref: String(r.id), title: r.title, status: r.type, owner: `${(r as any).attendeeIds?.length || 0} employees`, date: r.startDate, priority: "-" })),
    ...(timesheets || []).map(t => ({ module: "Timesheet", ref: String(t.id), title: t.taskDescription || "Timesheet", status: "logged", owner: t.userName || "-", date: t.date, priority: `${t.hoursWorked}h` })),
    ...(users || []).map(u => ({ module: "Employee", ref: u.employeeCode, title: u.name, status: u.status, owner: u.departmentName || "-", date: u.createdAt, priority: u.role })),
  ];

  const filtered = rows.filter(row => {
    if (moduleFilter !== "all" && row.module !== moduleFilter) return false;
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    const d = new Date(row.date);
    if (fromDate && d < new Date(fromDate)) return false;
    if (toDate && d > new Date(`${toDate}T23:59:59`)) return false;
    if (search) {
      const term = search.toLowerCase();
      if (!row.ref.toLowerCase().includes(term) && !row.title.toLowerCase().includes(term) && !row.owner.toLowerCase().includes(term)) return false;
    }
    return true;
  });
  const statuses = Array.from(new Set(rows.map(row => row.status))).filter(Boolean).sort();
  const paged = paginate(filtered);
  const headers = ["Module", "Reference", "Title", "Status", "Owner", "Date", "Priority"];
  const exportData = filtered.map(row => ({ Module: row.module, Reference: row.ref, Title: row.title, Status: row.status, Owner: row.owner, Date: row.date, Priority: row.priority }));

  return (
    <AppLayout title="Reports">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Reporting</h2>
            <p className="text-sm text-muted-foreground">Cross-module reports with module, status, search, and date range filters.</p>
          </div>
          <ExportMenu exportData={exportData} exportHeaders={headers} exportKeys={headers} exportFilename="reports" exportTitle="System Report" />
        </div>
        <Card>
          <CardContent className="flex flex-wrap gap-3 px-4 py-3">
            <Input className="h-9 min-w-[220px] flex-1" placeholder="Search reference, title, owner..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <Select value={moduleFilter} onValueChange={v => { setModuleFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{["all", "Ticket", "Project", "To-Do", "Reminder", "Timesheet", "Employee"].map(m => <SelectItem key={m} value={m}>{m === "all" ? "All Modules" : m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Status</SelectItem>{statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" className="h-9 w-36" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} />
            <Input type="date" className="h-9 w-36" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} />
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50"><TableRow>{headers.map(header => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{paged.map((row, index) => <TableRow key={`${row.module}-${row.ref}-${index}`}><TableCell>{row.module}</TableCell><TableCell className="font-mono text-primary">{row.ref}</TableCell><TableCell>{row.title}</TableCell><TableCell>{row.status}</TableCell><TableCell>{row.owner}</TableCell><TableCell>{row.date}</TableCell><TableCell>{row.priority}</TableCell></TableRow>)}</TableBody>
          </Table>
          <TableControls total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </Card>
      </div>
    </AppLayout>
  );
}
