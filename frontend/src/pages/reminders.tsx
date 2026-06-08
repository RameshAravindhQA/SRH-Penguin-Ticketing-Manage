import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getListCalendarEventsQueryKey, useListCalendarEvents, useListProjects, useListTickets, useListUsers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TableControls, usePagination } from "@/components/shared/TableControls";
import { format } from "date-fns";
import { BellRing, Edit, Plus, Search, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useConfirmation } from "@/components/shared/ConfirmationProvider";

type ReminderForm = {
  id?: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: string;
  entityType: string;
  entityId: string;
  attendeeIds: string[];
};

const emptyForm: ReminderForm = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  type: "reminder",
  entityType: "ticket",
  entityId: "",
  attendeeIds: [],
};

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
}

async function reminderFetch(path: string, init?: RequestInit) {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return null;
  return response.json();
}

function toLocalInput(date?: string | null) {
  if (!date) return "";
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}

export default function RemindersPage() {
  const confirm = useConfirmation();
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useListCalendarEvents({});
  const { data: users } = useListUsers();
  const { data: tickets } = useListTickets({});
  const { data: projects } = useListProjects({});
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<ReminderForm>(emptyForm);
  const [search, setSearch] = React.useState("");
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const [saving, setSaving] = React.useState(false);
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const reminders = React.useMemo(() => {
    return (events || []).filter((event) => {
      if (event.type !== "reminder" && event.type !== "follow_up" && event.type !== "deadline") return false;
      if (moduleFilter !== "all" && event.entityType !== moduleFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!event.title.toLowerCase().includes(s) && !(event.description || "").toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [events, moduleFilter, search]);

  const relatedOptions = form.entityType === "project"
    ? (projects || []).map((project: any) => ({ id: project.id, reference: project.projectNo, title: project.title }))
    : form.entityType === "ticket"
      ? (tickets || []).map((ticket: any) => ({ id: ticket.id, reference: ticket.ticketNo, title: ticket.subject }))
      : [];

  const selectedUsers = (ids: number[] = []) => (users || []).filter((user: any) => ids.includes(user.id));
  const refresh = () => queryClient.invalidateQueries({ queryKey: getListCalendarEventsQueryKey({}) });

  const openCreate = () => {
    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
    setForm({ ...emptyForm, startDate: toLocalInput(nextHour.toISOString()) });
    setDialogOpen(true);
  };

  const openEdit = (event: any) => {
    setForm({
      id: event.id,
      title: event.title,
      description: event.description || "",
      startDate: toLocalInput(event.startDate),
      endDate: toLocalInput(event.endDate),
      type: event.type || "reminder",
      entityType: event.entityType || "ticket",
      entityId: event.entityId ? String(event.entityId) : "",
      attendeeIds: (event as any).attendeeIds?.map(String) || [],
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.startDate) {
      toast.error("Title and reminder time are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        type: form.type,
        entityType: form.entityType || undefined,
        entityId: form.entityId ? Number(form.entityId) : undefined,
        attendeeIds: form.attendeeIds.map(Number),
      };
      if (form.id) {
        await reminderFetch(`/api/calendar/events/${form.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Reminder updated");
      } else {
        await reminderFetch("/api/calendar/events", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Reminder created");
      }
      setDialogOpen(false);
      refresh();
    } catch {
      toast.error("Failed to save reminder");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const confirmed = await confirm({
      title: "Delete reminder?",
      description: "This reminder will be removed from the calendar.",
      confirmText: "Delete Reminder",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await reminderFetch(`/api/calendar/events/${id}`, { method: "DELETE" });
      toast.success("Reminder deleted");
      refresh();
    } catch {
      toast.error("Failed to delete reminder");
    }
  };

  const paged = paginate(reminders);

  return (
    <AppLayout title="Reminders">
      <div className="flex h-full min-h-0 flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Reminder Management</h2>
            <p className="text-sm text-muted-foreground">Create, update, and track reminders against tickets, projects, and employees.</p>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Reminder
          </Button>
        </div>

        <Card className="border-slate-200">
          <CardContent className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="h-9 pl-9" placeholder="Search reminders..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
              </div>
              <Select value={moduleFilter} onValueChange={(value) => { setModuleFilter(value); setPage(1); }}>
                <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="ticket">Tickets</SelectItem>
                  <SelectItem value="project">Projects</SelectItem>
                  <SelectItem value="todo">To-Do</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardContent className="min-h-0 flex-1 overflow-auto p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading reminders...</div>
            ) : !paged.length ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-muted-foreground">
                <BellRing className="mb-3 h-10 w-10 opacity-30" />
                <p>No reminders match your filters.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50">
                  <TableRow>
                    <TableHead>Reminder</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((event) => {
                    const attendees = selectedUsers((event as any).attendeeIds || []);
                    return (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="font-semibold">{event.title}</div>
                          <div className="max-w-[360px] truncate text-xs text-muted-foreground">{event.description || "-"}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{format(new Date(event.startDate), "dd MMM yyyy, h:mm a")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{event.entityType || "general"} {event.entityId ? `#${event.entityId}` : ""}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex -space-x-2">
                            {attendees.slice(0, 4).map((user: any) => (
                              <Avatar key={user.id} className="h-7 w-7 border-2 border-white">
                                <AvatarImage src={user.avatarUrl || ""} />
                                <AvatarFallback className="text-[10px]">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            ))}
                            {attendees.length > 4 && <Badge variant="secondary" className="ml-3">+{attendees.length - 4}</Badge>}
                            {!attendees.length && <span className="text-xs text-muted-foreground">None</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(event)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => remove(event.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <TableControls total={reminders.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} showExport={false} />
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit Reminder" : "Create Reminder"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(event) => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Reminder title" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Reminder Date & Time</Label>
                  <Input type="datetime-local" value={form.startDate} onChange={(event) => setForm(current => ({ ...current, startDate: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date & Time</Label>
                  <Input type="datetime-local" value={form.endDate} onChange={(event) => setForm(current => ({ ...current, endDate: event.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(value) => setForm(current => ({ ...current, type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Module</Label>
                  <Select value={form.entityType} onValueChange={(value) => setForm(current => ({ ...current, entityType: value, entityId: "" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ticket">Ticket</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="todo">To-Do</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{form.entityType === "project" ? "Project" : form.entityType === "ticket" ? "Ticket" : "Related ID"}</Label>
                  {form.entityType === "ticket" || form.entityType === "project" ? (
                    <Select value={form.entityId || "none"} onValueChange={(value) => {
                      const selected = relatedOptions.find(option => String(option.id) === value);
                      setForm(current => ({
                        ...current,
                        entityId: value === "none" ? "" : value,
                        title: current.title || (selected ? `Reminder: ${selected.reference}` : current.title),
                        description: current.description || selected?.title || current.description,
                      }));
                    }}>
                      <SelectTrigger><SelectValue placeholder={`Select ${form.entityType}`} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No {form.entityType}</SelectItem>
                        {relatedOptions.map(option => (
                          <SelectItem key={option.id} value={String(option.id)}>{option.reference} - {option.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.entityId} onChange={(event) => setForm(current => ({ ...current, entityId: event.target.value }))} placeholder="Related record ID" />
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Employees</Label>
                <div className="grid max-h-40 grid-cols-1 gap-2 overflow-auto rounded-md border p-2 md:grid-cols-2">
                  {users?.map((user: any) => {
                    const value = String(user.id);
                    const checked = form.attendeeIds.includes(value);
                    return (
                      <label key={user.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => setForm(current => ({
                            ...current,
                            attendeeIds: event.target.checked
                              ? [...current.attendeeIds, value]
                              : current.attendeeIds.filter(id => id !== value),
                          }))}
                        />
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatarUrl || ""} />
                          <AvatarFallback className="text-[10px]">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>{user.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(event) => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Reminder details" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Reminder"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
