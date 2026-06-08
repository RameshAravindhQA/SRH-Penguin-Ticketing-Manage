import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { TeamTicketsTable } from "@/components/dashboard/TeamTicketsTable";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";
import { CalendarPanel } from "@/components/dashboard/CalendarPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  useGetDashboardStats,
  useGetMe,
  useListCalendarEvents,
  useListNotifications,
  useListProjects,
  useListTickets,
  useListUsers,
} from "@workspace/api-client-react";
import {
  Activity,
  AlertCircle,
  Archive,
  Briefcase,
  CheckCircle2,
  Clock,
  Inbox,
  CalendarClock,
  LogIn,
  Quote,
  Sparkles,
  Target,
} from "lucide-react";
import { format } from "date-fns";

type DashboardFilters = {
  fromDate: string;
  toDate: string;
  lead: string;
  member: string;
  ticketType: string;
  ticketStatus: string;
  priority: string;
  project: string;
};

const emptyFilters: DashboardFilters = {
  fromDate: "",
  toDate: "",
  lead: "you",
  member: "all",
  ticketType: "all",
  ticketStatus: "all",
  priority: "all",
  project: "all",
};

function statusKey(status?: string | null) {
  return (status || "").toLowerCase().replace(/[()]/g, "").replace(/\s+/g, "_").replace(/-/g, "_");
}

function matchesStatusGroup(status: string | undefined | null, group: string) {
  const key = statusKey(status);
  if (group === "all") return true;
  if (group === "open-yts") return key === "open" || key === "yts" || key === "open_yts";
  if (group === "in-progress") return key === "in_progress";
  return key === group;
}

function dateInRange(value: string, fromDate: string, toDate: string) {
  const date = new Date(value);
  if (fromDate && date < new Date(`${fromDate}T00:00:00`)) return false;
  if (toDate && date > new Date(`${toDate}T23:59:59`)) return false;
  return true;
}

export default function DashboardPage() {
  const { data: me } = useGetMe();
  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrorDetails, refetch: refetchStats } = useGetDashboardStats();
  const { data: tickets, isLoading: ticketsLoading, refetch: refetchTickets } = useListTickets({});
  const { data: users } = useListUsers();
  const { data: projects, refetch: refetchProjects } = useListProjects({});
  const { data: notifications } = useListNotifications({ unreadOnly: false });
  const { data: calendarEvents } = useListCalendarEvents({});

  const [activeTab, setActiveTab] = useState("all");
  const [draftFilters, setDraftFilters] = useState<DashboardFilters>(emptyFilters);
  const [filters, setFilters] = useState<DashboardFilters>(emptyFilters);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [loginMeta, setLoginMeta] = useState<{ loginAt?: string; lastLogin?: string | null } | null>(null);

  const ticketTypes = useMemo(() => {
    return Array.from(new Set((tickets || []).map(ticket => ticket.type).filter(Boolean))).sort();
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return (tickets || []).filter(ticket => {
      if (!dateInRange(ticket.createdAt, filters.fromDate, filters.toDate)) return false;
      if (filters.lead === "you" && me?.id && ticket.createdById !== me.id) return false;
      if (filters.member !== "all" && String(ticket.assignedToId || "") !== filters.member) return false;
      if (filters.ticketType !== "all" && ticket.type !== filters.ticketType) return false;
      if (filters.ticketStatus !== "all" && !matchesStatusGroup(ticket.status, filters.ticketStatus)) return false;
      if (filters.priority !== "all" && statusKey(ticket.priority) !== filters.priority) return false;
      if (filters.project !== "all" && String(ticket.projectId || "") !== filters.project) return false;
      return true;
    });
  }, [filters, me?.id, tickets]);

  const visibleTickets = useMemo(() => {
    return filteredTickets.filter(ticket => matchesStatusGroup(ticket.status, activeTab === "projects" ? "all" : activeTab));
  }, [activeTab, filteredTickets]);

  const filteredProjects = useMemo(() => {
    return (projects || []).filter(project => {
      if (!dateInRange(project.createdAt, filters.fromDate, filters.toDate)) return false;
      if (filters.project !== "all" && String(project.id) !== filters.project) return false;
      if (filters.lead === "you" && me?.id && project.ownerId !== me.id && project.processOwnerId !== me.id) return false;
      return true;
    });
  }, [filters, me?.id, projects]);

  const upcomingReminders = useMemo(() => {
    const now = Date.now();
    const nextDay = now + 24 * 60 * 60 * 1000;
    return (calendarEvents || []).filter(event => {
      const time = new Date(event.startDate).getTime();
      return time >= now && time <= nextDay;
    }).slice(0, 5);
  }, [calendarEvents]);

  const cardCounts = {
    total: tickets ? filteredTickets.length : stats?.totalIncoming ?? 0,
    open: tickets ? filteredTickets.filter(ticket => matchesStatusGroup(ticket.status, "open-yts")).length : stats?.openTickets ?? 0,
    pending: tickets ? filteredTickets.filter(ticket => matchesStatusGroup(ticket.status, "pending")).length : stats?.pendingTickets ?? 0,
    inProgress: tickets ? filteredTickets.filter(ticket => matchesStatusGroup(ticket.status, "in-progress")).length : stats?.inProgressTickets ?? 0,
    completed: tickets ? filteredTickets.filter(ticket => matchesStatusGroup(ticket.status, "completed")).length : stats?.completedTickets ?? 0,
    closed: tickets ? filteredTickets.filter(ticket => matchesStatusGroup(ticket.status, "closed")).length : stats?.closedTickets ?? 0,
    projectsAssigned: projects ? filteredProjects.length : stats?.projectsAssigned ?? 0,
    projectsCompleted: projects ? filteredProjects.filter(project => statusKey(project.status) === "completed").length : stats?.projectsCompleted ?? 0,
  };

  const apiErrorMessage = statsErrorDetails instanceof Error
    ? statsErrorDetails.message
    : "Unable to load dashboard data from the backend API.";

  useEffect(() => {
    const timer = window.setInterval(() => {
      refetchStats();
      refetchTickets();
      refetchProjects();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refetchProjects, refetchStats, refetchTickets]);

  useEffect(() => {
    if (!me) return;
    const raw = sessionStorage.getItem("login_welcome");
    if (!raw) return;
    try {
      setLoginMeta(JSON.parse(raw));
    } catch {
      setLoginMeta({ loginAt: new Date().toISOString(), lastLogin: null });
    }
    setWelcomeOpen(true);
  }, [me]);

  const applyFilters = () => setFilters(draftFilters);
  const resetFilters = () => {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    setActiveTab("all");
  };

  const hour = new Date().getHours();
  const wish = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const closeWelcome = () => {
    setWelcomeOpen(false);
    if (upcomingReminders.length) setReminderOpen(true);
    else sessionStorage.removeItem("login_welcome");
  };
  const closeReminders = () => {
    setReminderOpen(false);
    sessionStorage.removeItem("login_welcome");
  };

  return (
    <AppLayout title="Dashboard">
      <div className="flex flex-col gap-6">
        <Card className="rounded-md border shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex w-[130px] flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">From Date</span>
                <Input type="date" value={draftFilters.fromDate} onChange={event => setDraftFilters(v => ({ ...v, fromDate: event.target.value }))} className="h-8 text-xs" />
              </label>
              <label className="flex w-[130px] flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">To Date</span>
                <Input type="date" value={draftFilters.toDate} onChange={event => setDraftFilters(v => ({ ...v, toDate: event.target.value }))} className="h-8 text-xs" />
              </label>
              <label className="flex w-[140px] flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Lead</span>
                <Select value={draftFilters.lead} onValueChange={value => setDraftFilters(v => ({ ...v, lead: value }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="you">You</SelectItem>
                    <SelectItem value="all">All Leads</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="flex w-[150px] flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Member</span>
                <Select value={draftFilters.member} onValueChange={value => setDraftFilters(v => ({ ...v, member: value }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {(users || []).map(user => <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex w-[140px] flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Ticket Type</span>
                <Select value={draftFilters.ticketType} onValueChange={value => setDraftFilters(v => ({ ...v, ticketType: value }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {ticketTypes.map(type => <SelectItem key={type} value={type || "general"}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex w-[140px] flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Ticket Status</span>
                <Select value={draftFilters.ticketStatus} onValueChange={value => setDraftFilters(v => ({ ...v, ticketStatus: value }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open-yts">Open (YTS)</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="flex w-[120px] flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Priority</span>
                <Select value={draftFilters.priority} onValueChange={value => setDraftFilters(v => ({ ...v, priority: value }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="flex w-[160px] flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Project</span>
                <Select value={draftFilters.project} onValueChange={value => setDraftFilters(v => ({ ...v, project: value }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {(projects || []).map(project => <SelectItem key={project.id} value={String(project.id)}>{project.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <div className="ml-auto flex gap-2">
                <Button size="sm" className="h-8 px-4 text-xs" onClick={applyFilters}>Apply Filter</Button>
                <Button size="sm" variant="outline" className="h-8 px-4 text-xs" onClick={resetFilters}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {statsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Dashboard API is not connected</AlertTitle>
            <AlertDescription>
              {apiErrorMessage}. Sign out and sign in again, or confirm the frontend is using http://localhost:6001.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
          <StatCard title="Total Tickets" value={statsLoading ? 0 : cardCounts.total} icon={Inbox} trend="Live" tone="sky" active={activeTab === "all"} onClick={() => setActiveTab("all")} />
          <StatCard title="Open (YTS)" value={statsLoading ? 0 : cardCounts.open} icon={AlertCircle} trend="Live" trendUp={false} tone="emerald" active={activeTab === "open-yts"} onClick={() => setActiveTab("open-yts")} />
          <StatCard title="Pending" value={statsLoading ? 0 : cardCounts.pending} icon={Clock} trend="Live" tone="amber" active={activeTab === "pending"} onClick={() => setActiveTab("pending")} />
          <StatCard title="In Progress" value={statsLoading ? 0 : cardCounts.inProgress} icon={Activity} trend="Live" trendUp={false} tone="orange" active={activeTab === "in-progress"} onClick={() => setActiveTab("in-progress")} />
          <StatCard title="Completed" value={statsLoading ? 0 : cardCounts.completed} icon={CheckCircle2} trend="Live" tone="emerald" active={activeTab === "completed"} onClick={() => setActiveTab("completed")} />
          <StatCard title="Closed" value={statsLoading ? 0 : cardCounts.closed} icon={Archive} trend="Live" trendUp={false} tone="violet" active={activeTab === "closed"} onClick={() => setActiveTab("closed")} />
          <StatCard title="Projects Assigned" value={statsLoading ? 0 : cardCounts.projectsAssigned} icon={Briefcase} trend="View Projects" tone="indigo" active={activeTab === "projects"} onClick={() => setActiveTab("projects")} />
          <StatCard title="Projects Completed" value={statsLoading ? 0 : cardCounts.projectsCompleted} icon={Target} trend="View Projects" tone="emerald" active={activeTab === "projects"} onClick={() => setActiveTab("projects")} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="flex flex-col gap-4 lg:col-span-3">
            <Card className="flex-1 shadow-sm">
              <div className="border-b px-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="h-12 w-full justify-start rounded-none border-b bg-transparent p-0">
                    {[
                      ["all", "All"],
                      ["open-yts", "Open (YTS)"],
                      ["pending", "Pending"],
                      ["in-progress", "In Progress"],
                      ["completed", "Completed"],
                      ["closed", "Closed"],
                      ["projects", "Projects"],
                    ].map(([value, label]) => (
                      <TabsTrigger key={value} value={value} className="rounded-none border-b-2 border-transparent bg-transparent px-4 font-semibold text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              <CardContent className="p-0">
                <div className="p-4">
                  <h3 className="mb-4 text-lg font-semibold">{activeTab === "projects" ? "Project Overview" : "Team Tickets"}</h3>
                  {activeTab === "projects" ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead>Project No</TableHead>
                            <TableHead>Project Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead className="text-right">Progress</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProjects.slice(0, 10).map(project => (
                            <TableRow key={project.id}>
                              <TableCell className="font-medium text-primary">{project.projectNo}</TableCell>
                              <TableCell>{project.title}</TableCell>
                              <TableCell>{project.status}</TableCell>
                              <TableCell>{project.priority}</TableCell>
                              <TableCell>{project.ownerName || "-"}</TableCell>
                              <TableCell>{project.startDate ? format(new Date(project.startDate), "dd MMM yyyy") : "-"}</TableCell>
                              <TableCell>{project.endDate ? format(new Date(project.endDate), "dd MMM yyyy") : "-"}</TableCell>
                              <TableCell className="text-right">{project.progress ?? 0}%</TableCell>
                            </TableRow>
                          ))}
                          {!filteredProjects.length && (
                            <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No projects found.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <TeamTicketsTable tickets={visibleTickets.slice(0, 10)} isLoading={ticketsLoading} />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-1">
            <QuickActions />
            <NotificationsPanel notifications={notifications || []} />
            <CalendarPanel events={calendarEvents || []} />
          </div>
        </div>
      </div>

      <Dialog open={welcomeOpen} onOpenChange={(open) => { if (!open) closeWelcome(); }}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
          <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-emerald-900 px-6 py-6 text-white">
            <DialogHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-white/15">
                <Sparkles className="h-6 w-6 text-amber-200" />
              </div>
              <DialogTitle className="text-2xl text-white">Hi {me?.name || "there"}, {wish}</DialogTitle>
              <DialogDescription className="text-blue-100">
                Welcome back to SRH Penguin Ticketing Management System.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-4 p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Employee Code", me?.employeeCode || "-"],
                ["Department", me?.departmentName || "Not assigned"],
                ["Role", me?.role || "-"],
                ["Login Time", loginMeta?.loginAt ? new Date(loginMeta.loginAt).toLocaleString() : new Date().toLocaleString()],
                ["Last Login", loginMeta?.lastLogin ? new Date(loginMeta.lastLogin).toLocaleString() : "First login"],
                ["Upcoming Reminders", String(upcomingReminders.length)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border bg-slate-50 px-3 py-2">
                  <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
              <div className="mb-2 flex items-center gap-2 font-semibold"><Quote className="h-4 w-4" /> Daily Motivation</div>
              Focus on the next useful update: acknowledge, assign, resolve, and keep the team informed.
            </div>
          </div>
          <DialogFooter className="border-t bg-slate-50 px-6 py-4">
            <Button onClick={closeWelcome} className="gap-2">
              <LogIn className="h-4 w-4" />
              Continue to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reminderOpen} onOpenChange={(open) => { if (!open) closeReminders(); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Upcoming Reminders</DialogTitle>
            <DialogDescription>These reminders are due in the next 24 hours.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[360px] gap-3 overflow-auto py-2">
            {upcomingReminders.map(item => (
              <button key={item.id} className="flex items-center justify-between gap-4 rounded-md border bg-amber-50 px-3 py-3 text-left text-sm text-amber-950 hover:bg-amber-100" onClick={closeReminders}>
                <span className="flex min-w-0 items-center gap-2">
                  <CalendarClock className="h-4 w-4 shrink-0" />
                  <span className="truncate font-medium">{item.title}</span>
                </span>
                <Badge className="shrink-0 bg-amber-100 text-amber-800">{format(new Date(item.startDate), "dd MMM, h:mm a")}</Badge>
              </button>
            ))}
            {!upcomingReminders.length && <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No reminders due in the next 24 hours.</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeReminders}>Snooze</Button>
            <Button onClick={closeReminders}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
