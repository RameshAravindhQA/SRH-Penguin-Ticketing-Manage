import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getListCalendarEventsQueryKey, useListCalendarEvents, useListProjects, useListTickets, useListUsers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { Calendar as CalendarIcon, Edit, ExternalLink, LayoutGrid, List, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type CalendarForm = {
  id?: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: string;
  meetingLink: string;
  entityType: string;
  entityId: string;
  attendeeIds: string[];
};

const emptyForm: CalendarForm = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  type: "reminder",
  meetingLink: "",
  entityType: "ticket",
  entityId: "",
  attendeeIds: [],
};

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
}

async function calendarFetch(path: string, init?: RequestInit) {
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

function googleCalendarUrl(event: { title: string; description?: string | null; startDate: string; endDate?: string | null; meetingLink?: string | null }) {
  const start = new Date(event.startDate).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const end = new Date(event.endDate || new Date(new Date(event.startDate).getTime() + 30 * 60000)).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const details = [event.description || "", event.meetingLink ? `Meet: ${event.meetingLink}` : ""].filter(Boolean).join("\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useListCalendarEvents({});
  const { data: users } = useListUsers();
  const { data: tickets } = useListTickets({});
  const { data: projects } = useListProjects({});
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<CalendarForm>(emptyForm);
  const [view, setView] = React.useState<"calendar" | "table">("calendar");
  const [saving, setSaving] = React.useState(false);
  const today = new Date();
  const monthStart = startOfMonth(today);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(today), { weekStartsOn: 1 });
  const calendarDays: Date[] = [];
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) {
    calendarDays.push(day);
  }
  const relatedOptions = form.entityType === "project"
    ? (projects || []).map((project: any) => ({ id: project.id, reference: project.projectNo, title: project.title }))
    : form.entityType === "ticket"
      ? (tickets || []).map((ticket: any) => ({ id: ticket.id, reference: ticket.ticketNo, title: ticket.subject }))
      : [];

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
      meetingLink: event.meetingLink || "",
      entityType: event.entityType || "ticket",
      entityId: event.entityId ? String(event.entityId) : "",
      attendeeIds: (event as any).attendeeIds?.map(String) || [],
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.startDate) {
      toast.error("Title and start date/time are required");
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
        meetingLink: form.meetingLink.trim() || undefined,
        entityType: form.entityType || undefined,
        entityId: form.entityId ? Number(form.entityId) : undefined,
        attendeeIds: form.attendeeIds.map(Number),
      };
      if (form.id) {
        await calendarFetch(`/api/calendar/events/${form.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Reminder updated");
      } else {
        await calendarFetch("/api/calendar/events", { method: "POST", body: JSON.stringify(payload) });
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
    try {
      await calendarFetch(`/api/calendar/events/${id}`, { method: "DELETE" });
      toast.success("Reminder deleted");
      refresh();
    } catch {
      toast.error("Failed to delete reminder");
    }
  };

  return (
    <AppLayout title="Calendar">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{format(today, "MMMM yyyy")}</h2>
            <p className="text-sm text-muted-foreground">Manage reminders, ticket follow-ups, meetings, and Google calendar links.</p>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Reminder
          </Button>
        </div>

        <div className="flex w-fit overflow-hidden rounded-md border bg-white">
          <Button variant={view === "calendar" ? "secondary" : "ghost"} size="sm" className="rounded-none gap-2" onClick={() => setView("calendar")}>
            <LayoutGrid className="h-4 w-4" /> Calendar View
          </Button>
          <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" className="rounded-none gap-2" onClick={() => setView("table")}>
            <List className="h-4 w-4" /> Table View
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-4">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading calendar...</div>
            ) : !events?.length ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-muted-foreground">
                <CalendarIcon className="mb-4 h-12 w-12 opacity-20" />
                <p>No reminders or meetings created.</p>
              </div>
            ) : view === "calendar" ? (
              <div className="overflow-auto rounded-md border bg-white">
                <div className="grid min-w-[980px] grid-cols-7 border-b bg-slate-50 text-center text-xs font-semibold uppercase text-muted-foreground">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <div key={day} className="border-r p-2 last:border-r-0">{day}</div>)}
                </div>
                <div className="grid min-w-[980px] grid-cols-7">
                  {calendarDays.map((date) => {
                    const dayEvents = (events || []).filter(event => isSameDay(new Date(event.startDate), date));
                    const todayCell = isSameDay(date, today);
                    return (
                      <div key={date.toISOString()} className={`min-h-[132px] border-b border-r p-2 last:border-r-0 ${isSameMonth(date, today) ? "bg-white" : "bg-slate-50/60"} ${todayCell ? "ring-1 ring-inset ring-primary" : ""}`}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${todayCell ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                            {format(date, "d")}
                          </span>
                          {dayEvents.length > 0 && <span className="text-[11px] text-muted-foreground">{dayEvents.length}</span>}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map(event => (
                            <button key={event.id} onClick={() => openEdit(event)} className="w-full rounded border-l-2 border-l-primary bg-primary/5 px-2 py-1 text-left text-[11px] hover:bg-primary/10">
                              <div className="truncate font-semibold">{event.title}</div>
                              <div className="truncate text-muted-foreground">{format(new Date(event.startDate), "h:mm a")} - {event.type}</div>
                            </button>
                          ))}
                          {dayEvents.length > 3 && <div className="text-[11px] text-muted-foreground">+{dayEvents.length - 3} more</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : view === "table" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Start</th>
                      <th className="px-3 py-2 font-medium">Employees</th>
                      <th className="px-3 py-2 font-medium">Related</th>
                      <th className="px-3 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id} className="border-b">
                        <td className="px-3 py-2 font-medium">{event.title}</td>
                        <td className="px-3 py-2 capitalize">{event.type}</td>
                        <td className="px-3 py-2">{format(new Date(event.startDate), "dd MMM yyyy, h:mm a")}</td>
                        <td className="px-3 py-2">{((event as any).attendeeIds || []).length}</td>
                        <td className="px-3 py-2 capitalize">{event.entityType || "-"} {event.entityId || ""}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer"><Button variant="ghost" size="icon" className="h-8 w-8" title="Sync to Google Calendar"><ExternalLink className="h-4 w-4" /></Button></a>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(event)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(event.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="rounded-md border border-l-4 border-l-primary bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-foreground">{event.title}</h4>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">{event.type}</span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {format(new Date(event.startDate), "dd MMM yyyy, h:mm a")}
                          {event.endDate ? ` - ${format(new Date(event.endDate), "h:mm a")}` : ""}
                        </div>
                        {((event as any).attendeeIds || []).length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">{((event as any).attendeeIds || []).length} employee(s) selected</div>
                        )}
                        {event.description && <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        {event.meetingLink && (
                          <a href={event.meetingLink} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" className="gap-2"><Video className="h-4 w-4" /> Meet</Button>
                          </a>
                        )}
                        <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm" className="gap-2"><ExternalLink className="h-4 w-4" /> Sync Google</Button>
                        </a>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(event)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(event.id)}>
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit Reminder" : "Create Reminder"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(event) => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Reminder or meeting title" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Start Date & Time</Label>
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
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Related Module</Label>
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
                    <Select
                      value={form.entityId || "none"}
                      onValueChange={(value) => {
                        const selected = relatedOptions.find(option => String(option.id) === value);
                        setForm(current => ({
                          ...current,
                          entityId: value === "none" ? "" : value,
                          title: current.title || (selected ? `Reminder: ${selected.reference}` : current.title),
                          description: current.description || selected?.title || current.description,
                        }));
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder={`Select ${form.entityType}`} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No {form.entityType}</SelectItem>
                        {relatedOptions.map(option => (
                          <SelectItem key={option.id} value={String(option.id)}>
                            {option.reference} - {option.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.entityId} onChange={(event) => setForm(current => ({ ...current, entityId: event.target.value }))} placeholder="Related record ID" />
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Google Meet Link</Label>
                <div className="flex gap-2">
                  <Input value={form.meetingLink} onChange={(event) => setForm(current => ({ ...current, meetingLink: event.target.value }))} placeholder="Paste Meet link or create one" />
                  <a href="https://meet.google.com/new" target="_blank" rel="noreferrer">
                    <Button type="button" variant="outline" className="gap-2"><Video className="h-4 w-4" /> Create</Button>
                  </a>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Employees</Label>
                <div className="grid max-h-36 grid-cols-1 gap-2 overflow-auto rounded-md border p-2 md:grid-cols-2">
                  {users?.map(user => {
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
                        <span>{user.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(event) => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Notes, work details, or agenda" />
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
