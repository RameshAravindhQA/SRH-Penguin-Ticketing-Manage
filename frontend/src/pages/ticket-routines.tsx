import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { ModuleStats } from "@/components/shared/ModuleStats";
import { TableControls, usePagination } from "@/components/shared/TableControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useListCategories, useListUsers } from "@workspace/api-client-react";
import { CalendarClock, CheckCircle2, Clock, Edit, Plus, Search, TimerReset, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createTicketRoutine, deleteTicketRoutine, listTicketRoutines, updateTicketRoutine, type TicketRoutine, type TicketRoutineInput } from "@/lib/ticket-workflow";
import { useConfirmation } from "@/components/shared/ConfirmationProvider";

const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:6001";

async function listDepartments() {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${apiBase}/api/departments`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<Array<{ id: number; name: string }>>;
}

const emptyForm = {
  subject: "",
  description: "",
  priority: "medium",
  categoryId: "",
  schedule: "daily",
  departmentId: "",
  startDate: "",
  closingDate: "",
  assignToId: "",
  assignCcId: "",
  days: "",
};

export default function TicketRoutinesPage() {
  const confirm = useConfirmation();
  const queryClient = useQueryClient();
  const { data: routines, isLoading } = useQuery({ queryKey: ["ticket-routines"], queryFn: listTicketRoutines });
  const { data: categories } = useListCategories();
  const { data: users } = useListUsers();
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const [search, setSearch] = React.useState("");
  const [scheduleFilter, setScheduleFilter] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TicketRoutine | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const filtered = (routines || []).filter((routine) => {
    if (scheduleFilter !== "all" && routine.schedule !== scheduleFilter) return false;
    if (priorityFilter !== "all" && routine.priority !== priorityFilter) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return routine.routineNo.toLowerCase().includes(term) || routine.subject.toLowerCase().includes(term);
  });
  const paged = paginate(filtered);
  const counts = {
    all: routines?.length || 0,
    daily: routines?.filter(routine => routine.schedule === "daily").length || 0,
    weekly: routines?.filter(routine => routine.schedule === "weekly").length || 0,
    monthly: routines?.filter(routine => routine.schedule === "monthly").length || 0,
  };
  const exportData = filtered.map(routine => ({
    "Routine No": routine.routineNo,
    Subject: routine.subject,
    Schedule: routine.schedule,
    Priority: routine.priority,
    Department: routine.departmentName || "-",
    Category: routine.categoryName || "-",
    Status: routine.status,
    "Start Date": routine.startDate || "-",
    "Closing Date": routine.closingDate || "-",
  }));
  const exportHeaders = ["Routine No", "Subject", "Schedule", "Priority", "Department", "Category", "Status", "Start Date", "Closing Date"];

  const set = (key: keyof typeof emptyForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const setSelect = (key: keyof typeof emptyForm) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value === "none" ? "" : value }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (routine: TicketRoutine) => {
    setEditing(routine);
    setForm({
      subject: routine.subject,
      description: routine.description || "",
      priority: routine.priority,
      categoryId: routine.categoryId ? String(routine.categoryId) : "",
      schedule: routine.schedule,
      departmentId: routine.departmentId ? String(routine.departmentId) : "",
      startDate: routine.startDate ? routine.startDate.slice(0, 10) : "",
      closingDate: routine.closingDate ? routine.closingDate.slice(0, 10) : "",
      assignToId: routine.assignToIds?.[0] ? String(routine.assignToIds[0]) : "",
      assignCcId: routine.assignCcIds?.[0] ? String(routine.assignCcIds[0]) : "",
      days: "",
    });
    setOpen(true);
  };

  const removeRoutine = async (routine: TicketRoutine) => {
    const confirmed = await confirm({
      title: "Delete routine ticket?",
      description: `Routine ${routine.routineNo} will be deleted.`,
      confirmText: "Delete Routine",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await deleteTicketRoutine(routine.id);
      toast.success("Routine deleted");
      queryClient.invalidateQueries({ queryKey: ["ticket-routines"] });
    } catch {
      toast.error("Failed to delete routine");
    }
  };

  const save = async () => {
    if (!form.subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    const payload: TicketRoutineInput = {
      subject: form.subject.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority,
      schedule: form.schedule,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      departmentId: form.departmentId ? Number(form.departmentId) : undefined,
      startDate: form.startDate || undefined,
      closingDate: form.closingDate || undefined,
      assignToIds: form.assignToId ? [Number(form.assignToId)] : [],
      assignCcIds: form.assignCcId ? [Number(form.assignCcId)] : [],
      days: form.days.split(",").map((day) => Number(day.trim())).filter(Number.isFinite),
    };
    setSaving(true);
    try {
      if (editing) await updateTicketRoutine(editing.id, payload);
      else await createTicketRoutine(payload);
      toast.success(editing ? "Routine ticket updated" : "Routine ticket created");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["ticket-routines"] });
    } catch {
      toast.error("Failed to create routine ticket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Routine Tickets">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Routine Tickets</h2>
            <p className="text-sm text-muted-foreground">Create and monitor scheduled recurring ticket work.</p>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Routine
          </Button>
        </div>

        <ModuleStats
          stats={[
            { label: "All Routines", value: counts.all, icon: CalendarClock, tone: "sky", active: scheduleFilter === "all", onClick: () => { setScheduleFilter("all"); setPage(1); } },
            { label: "Daily", value: counts.daily, icon: TimerReset, tone: "emerald", active: scheduleFilter === "daily", onClick: () => { setScheduleFilter("daily"); setPage(1); } },
            { label: "Weekly", value: counts.weekly, icon: Clock, tone: "amber", active: scheduleFilter === "weekly", onClick: () => { setScheduleFilter("weekly"); setPage(1); } },
            { label: "Monthly", value: counts.monthly, icon: CheckCircle2, tone: "violet", active: scheduleFilter === "monthly", onClick: () => { setScheduleFilter("monthly"); setPage(1); } },
          ]}
        />

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-9 pl-9" placeholder="Search routine no or subject..." />
            </div>
            <Select value={scheduleFilter} onValueChange={(value) => { setScheduleFilter(value); setPage(1); }}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schedule</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(value) => { setPriorityFilter(value); setPage(1); }}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">Loading routine tickets...</div>
          ) : !filtered.length ? (
            <div className="p-12 text-center text-muted-foreground">No routine tickets found.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Routine</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((routine) => (
                  <TableRow key={routine.id}>
                    <TableCell className="font-mono font-medium text-primary">{routine.routineNo}</TableCell>
                    <TableCell className="max-w-[320px] truncate font-medium">{routine.subject}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{routine.schedule}</Badge></TableCell>
                    <TableCell className="capitalize">{routine.priority}</TableCell>
                    <TableCell>{routine.departmentName || "-"}</TableCell>
                    <TableCell>{routine.startDate ? format(new Date(routine.startDate), "dd MMM yyyy") : "-"}</TableCell>
                    <TableCell className="capitalize">{routine.status}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(routine)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => removeRoutine(routine)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <TableControls
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            exportData={exportData}
            exportHeaders={exportHeaders}
            exportKeys={exportHeaders}
            exportFilename="routine-tickets"
            exportTitle="Routine Tickets"
          />
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" /> {editing ? "Edit Routine Ticket" : "Create Routine Ticket"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={set("subject")} />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Schedule</Label>
                  <Select value={form.schedule} onValueChange={setSelect("schedule")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={setSelect("priority")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.categoryId || "none"} onValueChange={setSelect("categoryId")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories?.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select value={form.departmentId || "none"} onValueChange={setSelect("departmentId")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments?.map((department) => <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={set("startDate")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Closing Date</Label>
                  <Input type="date" value={form.closingDate} onChange={set("closingDate")} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Assign To</Label>
                  <Select value={form.assignToId || "none"} onValueChange={setSelect("assignToId")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No User</SelectItem>
                      {users?.map((user) => <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Assign CC</Label>
                  <Select value={form.assignCcId || "none"} onValueChange={setSelect("assignCcId")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No CC</SelectItem>
                      {users?.map((user) => <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Days</Label>
                  <Input value={form.days} onChange={set("days")} placeholder="Comma separated, e.g. 1,3,5" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={set("description")} className="min-h-[110px]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : editing ? "Update Routine" : "Save Routine"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
