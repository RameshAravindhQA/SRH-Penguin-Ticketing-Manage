import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListTimesheets } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Clock, Search, CalendarDays, Timer, BarChart3 } from "lucide-react";
import { ExportMenu, TableControls, usePagination } from "@/components/shared/TableControls";
import { ModuleStats } from "@/components/shared/ModuleStats";

export default function TimesheetsPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const { data: timesheets, isLoading } = useListTimesheets({ fromDate: fromDate || undefined, toDate: toDate || undefined });
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const filtered = useMemo(() => {
    let data = timesheets || [];
    if (search) { const s = search.toLowerCase(); data = data.filter(t => t.taskDescription?.toLowerCase().includes(s) || t.date.includes(s)); }
    return data;
  }, [timesheets, search]);

  const paged = paginate(filtered);
  const totalHours = filtered.reduce((sum, t) => sum + (t.hoursWorked || 0), 0);

  const exportData = filtered.map(t => ({
    Date: t.date, User: t.userName || "-", "Login": t.loginTime || "-", "Logout": t.logoutTime || "-",
    "Hours": t.hoursWorked, Description: t.taskDescription || "-", Reference: t.ticketId ? `TKT-${t.ticketId}` : t.projectId ? `PRJ-${t.projectId}` : "General",
  }));
  const exportHeaders = ["Date", "User", "Login", "Logout", "Hours", "Description", "Reference"];
  const exportKeys = exportHeaders;

  return (
    <AppLayout title="Timesheets">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Time Tracking</h2>
            <p className="text-muted-foreground text-sm">Timesheet records are generated from self-assigned ticket work comments.</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu exportData={exportData} exportHeaders={exportHeaders} exportKeys={exportKeys} exportFilename="timesheets" exportTitle="Timesheet Report" />
          </div>
        </div>

        <ModuleStats
          stats={[
            { label: "Total Entries", value: filtered.length, icon: CalendarDays, tone: "sky" },
            { label: "Total Hours", value: `${totalHours.toFixed(1)}h`, icon: Timer, tone: "emerald" },
            { label: "Avg per Entry", value: filtered.length > 0 ? `${(totalHours / filtered.length).toFixed(1)}h` : "0h", icon: BarChart3, tone: "violet" },
            { label: "Date Filtered", value: fromDate || toDate ? "Yes" : "No", icon: Clock, tone: "amber" },
          ]}
        />

        {/* Filters */}
        <Card className="border-slate-200">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search description..." className="pl-9 h-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">From:</Label>
                <Input type="date" className="h-9 w-36" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">To:</Label>
                <Input type="date" className="h-9 w-36" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} />
              </div>
              {(fromDate || toDate || search) && (
                <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setFromDate(""); setToDate(""); setSearch(""); setPage(1); }}>
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading timesheets...</div>
            ) : !paged.length ? (
              <div className="p-12 text-center text-muted-foreground">No time entries found.</div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Logout</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((entry, i) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground text-sm">{(page - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{entry.date}</TableCell>
                      <TableCell className="text-sm">{entry.userName || "-"}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{entry.loginTime || "-"}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{entry.logoutTime || "-"}</TableCell>
                      <TableCell className="font-mono font-bold text-primary">{entry.hoursWorked}h</TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">{entry.taskDescription || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {entry.ticketId ? `TKT-${entry.ticketId}` : entry.projectId ? `PRJ-${entry.projectId}` : "General"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <TableControls
            total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}
            exportData={exportData} exportHeaders={exportHeaders} exportKeys={exportKeys}
            exportFilename="timesheets" exportTitle="Timesheet Report"
          />
        </Card>
      </div>
    </AppLayout>
  );
}
