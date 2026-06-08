import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportMenu } from "@/components/shared/TableControls";
import { useGetDashboardStats, useListCalendarEvents, useListNotifications, useListProjects, useListTickets } from "@workspace/api-client-react";
import { Activity, BellRing, CheckCircle2, Clock, FolderKanban, Ticket } from "lucide-react";
import { format, isSameDay } from "date-fns";

function Counter({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: any; tone: string }) {
  return (
    <Card className="rounded-md border-slate-200 bg-white">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 text-4xl font-bold tracking-tight">{value}</div>
        </div>
        <div className={`rounded-md p-3 ${tone}`}><Icon className="h-7 w-7" /></div>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <TableRow><TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">{label}</TableCell></TableRow>;
}

export default function MonitorBoardPage() {
  const { data: stats, refetch: refetchStats } = useGetDashboardStats();
  const { data: tickets, refetch: refetchTickets } = useListTickets({});
  const { data: projects, refetch: refetchProjects } = useListProjects({});
  const { data: reminders, refetch: refetchReminders } = useListCalendarEvents({});
  const { data: notifications, refetch: refetchNotifications } = useListNotifications({ unreadOnly: false });
  const today = new Date();

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      refetchStats();
      refetchTickets();
      refetchProjects();
      refetchReminders();
      refetchNotifications();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refetchNotifications, refetchProjects, refetchReminders, refetchStats, refetchTickets]);

  const todayTickets = (tickets || []).filter(ticket => isSameDay(new Date(ticket.createdAt), today));
  const todayProjects = (projects || []).filter(project => isSameDay(new Date(project.updatedAt || project.createdAt), today));
  const todayReminders = (reminders || []).filter(reminder => isSameDay(new Date(reminder.startDate), today));
  const latestAlerts = (notifications || []).slice(0, 20);
  const exportData = [
    ...todayTickets.map(ticket => ({ Module: "Ticket", Ref: ticket.ticketNo, Title: ticket.subject, Status: ticket.status, Time: format(new Date(ticket.createdAt), "dd MMM yyyy HH:mm") })),
    ...todayProjects.map(project => ({ Module: "Project", Ref: project.projectNo, Title: project.title, Status: project.status, Time: format(new Date(project.updatedAt || project.createdAt), "dd MMM yyyy HH:mm") })),
    ...todayReminders.map(reminder => ({ Module: "Reminder", Ref: reminder.type, Title: reminder.title, Status: reminder.type, Time: format(new Date(reminder.startDate), "dd MMM yyyy HH:mm") })),
    ...latestAlerts.map(alert => ({ Module: "Alert", Ref: alert.entityRef || alert.type, Title: alert.message, Status: alert.isRead ? "Read" : "Unread", Time: format(new Date(alert.createdAt), "dd MMM yyyy HH:mm") })),
  ];

  return (
    <AppLayout title="Monitor Board">
      <div className="flex min-h-full flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Live Operations Monitor</h2>
            <p className="text-sm text-muted-foreground">Auto-refreshing table board for TV display and shared team visibility.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-700">Live every 5s</Badge>
            <ExportMenu
              exportData={exportData}
              exportHeaders={["Module", "Ref", "Title", "Status", "Time"]}
              exportKeys={["Module", "Ref", "Title", "Status", "Time"]}
              exportFilename="monitor-board"
              exportTitle="Monitor Board"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          <Counter label="Total Tickets" value={stats?.teamTickets ?? 0} icon={Ticket} tone="bg-sky-100 text-sky-700" />
          <Counter label="Open / YTS" value={stats?.openTickets ?? 0} icon={Clock} tone="bg-amber-100 text-amber-700" />
          <Counter label="In Progress" value={stats?.inProgressTickets ?? 0} icon={Activity} tone="bg-orange-100 text-orange-700" />
          <Counter label="Completed" value={stats?.completedTickets ?? 0} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-700" />
          <Counter label="Projects" value={stats?.teamProjects ?? 0} icon={FolderKanban} tone="bg-indigo-100 text-indigo-700" />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="rounded-md">
            <CardHeader className="pb-3"><CardTitle className="text-base">Today Tickets</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-[34vh] overflow-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50">
                    <TableRow>
                      <TableHead>Ticket No</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayTickets.slice(0, 50).map(ticket => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-semibold text-primary">{ticket.ticketNo}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{ticket.subject}</TableCell>
                        <TableCell><Badge variant="outline">{ticket.status}</Badge></TableCell>
                        <TableCell>{ticket.priority}</TableCell>
                        <TableCell>{ticket.assignedToName || "Unassigned"}</TableCell>
                        <TableCell className="whitespace-nowrap">{format(new Date(ticket.createdAt), "HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                    {!todayTickets.length && <EmptyRow colSpan={6} label="No tickets created today." />}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardHeader className="pb-3"><CardTitle className="text-base">Project Updates</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-[34vh] overflow-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50">
                    <TableRow>
                      <TableHead>Project No</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Progress</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayProjects.slice(0, 50).map(project => (
                      <TableRow key={project.id}>
                        <TableCell className="font-semibold text-primary">{project.projectNo}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{project.title}</TableCell>
                        <TableCell><Badge variant="outline">{project.status}</Badge></TableCell>
                        <TableCell>{project.ownerName || "-"}</TableCell>
                        <TableCell className="text-right">{project.progress ?? 0}%</TableCell>
                        <TableCell className="whitespace-nowrap">{format(new Date(project.updatedAt || project.createdAt), "HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                    {!todayProjects.length && <EmptyRow colSpan={6} label="No project updates today." />}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md xl:col-span-2">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><BellRing className="h-4 w-4" /> Reminders & Alerts</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-[36vh] overflow-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50">
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Title / Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayReminders.slice(0, 30).map(reminder => (
                      <TableRow key={`r-${reminder.id}`}>
                        <TableCell>Reminder</TableCell>
                        <TableCell>{reminder.type}</TableCell>
                        <TableCell className="max-w-[520px] truncate">{reminder.title}</TableCell>
                        <TableCell><Badge className="bg-sky-100 text-sky-700">{reminder.entityType || "Scheduled"}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap">{format(new Date(reminder.startDate), "dd MMM HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                    {latestAlerts.map(note => (
                      <TableRow key={`n-${note.id}`}>
                        <TableCell>Alert</TableCell>
                        <TableCell>{note.entityRef || note.type}</TableCell>
                        <TableCell className="max-w-[520px] truncate">{note.message}</TableCell>
                        <TableCell><Badge className={note.isRead ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{note.isRead ? "Read" : "Unread"}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap">{format(new Date(note.createdAt), "dd MMM HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                    {!todayReminders.length && !latestAlerts.length && <EmptyRow colSpan={5} label="No reminders or alerts." />}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
