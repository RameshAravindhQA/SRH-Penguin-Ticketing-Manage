import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListTimesheets, useCreateTimesheet, getListTimesheetsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Clock, Plus, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TableControls, usePagination } from "@/components/shared/TableControls";

function LogTimeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createTimesheet = useCreateTimesheet();
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ date: today, loginTime: "09:00", logoutTime: "18:00", hoursWorked: "8", taskDescription: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = () => {
    if (!form.date || !form.hoursWorked) { toast.error("Date and hours are required"); return; }
    createTimesheet.mutate({
      data: { date: form.date, loginTime: form.loginTime, logoutTime: form.logoutTime, hoursWorked: Number(form.hoursWorked), taskDescription: form.taskDescription }
    }, {
      onSuccess: () => {
        toast.success("Time entry logged");
        qc.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
        onOpenChange(false);
        setForm({ date: today, loginTime: "09:00", logoutTime: "18:00", hoursWorked: "8", taskDescription: "" });
      },
      onError: () => toast.error("Failed to log time"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log Time Entry</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>Date <span className="text-red-500">*</span></Label><Input type="date" value={form.date} onChange={set("date")} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Login Time</Label><Input type="time" value={form.loginTime} onChange={set("loginTime")} /></div>
            <div className="space-y-1.5"><Label>Logout Time</Label><Input type="time" value={form.logoutTime} onChange={set("logoutTime")} /></div>
          </div>
          <div className="space-y-1.5"><Label>Hours Worked <span className="text-red-500">*</span></Label><Input type="number" min="0.5" max="24" step="0.5" value={form.hoursWorked} onChange={set("hoursWorked")} /></div>
          <div className="space-y-1.5"><Label>Task Description</Label><Textarea value={form.taskDescription} onChange={set("taskDescription")} placeholder="What did you work on?" className="min-h-[80px]" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createTimesheet.isPending}>{createTimesheet.isPending ? "Saving..." : "Log Time"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TimesheetsPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [logOpen, setLogOpen] = useState(false);
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
            <p className="text-muted-foreground text-sm">Log and review daily hours against tickets and projects.</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setLogOpen(true)}>
            <Plus className="w-4 h-4" /> Log Time
          </Button>
        </div>

        {/* Summary Card */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Entries", value: filtered.length, color: "text-primary" },
            { label: "Total Hours", value: `${totalHours.toFixed(1)}h`, color: "text-green-600" },
            { label: "Avg per Day", value: filtered.length > 0 ? `${(totalHours / filtered.length).toFixed(1)}h` : "0h", color: "text-blue-600" },
          ].map(s => (
            <Card key={s.label} className="border-slate-200">
              <CardContent className="py-4 px-5">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

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
      <LogTimeDialog open={logOpen} onOpenChange={setLogOpen} />
    </AppLayout>
  );
}
