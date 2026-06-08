import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getListTicketsQueryKey, Ticket as TicketType, useListTickets, useListCategories, useUpdateTicket, useUpdateTicketStatus } from "@workspace/api-client-react";
import { TicketTable } from "@/components/tickets/TicketTable";
import { TicketEditDialog, TicketEditValues } from "@/components/tickets/TicketEditDialog";
import { TicketActionDialog } from "@/components/tickets/TicketActionDialogs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Ticket, Clock, PlayCircle, CheckCircle2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { TableControls, usePagination } from "@/components/shared/TableControls";
import { ModuleStats } from "@/components/shared/ModuleStats";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AuditLogDialog } from "@/components/shared/AuditLogDialog";
import { ReminderDialog } from "@/components/shared/ReminderDialog";

export default function TicketsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [myTickets, setMyTickets] = useState(true);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [auditTicket, setAuditTicket] = useState<TicketType | null>(null);
  const [reminderTicket, setReminderTicket] = useState<TicketType | null>(null);
  const [actionTicket, setActionTicket] = useState<TicketType | null>(null);
  const [actionType, setActionType] = useState<"comment" | "reassign" | "forwardDepartment" | null>(null);
  const [, setLocation] = useLocation();

  const { data: tickets, isLoading } = useListTickets({ search, myTickets });
  const { data: categories } = useListCategories();
  const updateStatus = useUpdateTicketStatus();
  const updateTicket = useUpdateTicket();
  const queryClient = useQueryClient();
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const filtered = useMemo(() => {
    let data = tickets || [];
    if (statusFilter !== "all") data = data.filter(t => t.status === statusFilter);
    if (priorityFilter !== "all") data = data.filter(t => t.priority === priorityFilter);
    if (categoryFilter !== "all") data = data.filter(t => t.categoryId === Number(categoryFilter));
    return data;
  }, [tickets, statusFilter, priorityFilter, categoryFilter]);

  const paged = paginate(filtered);

  const counts = useMemo(() => ({
    all: tickets?.length || 0,
    open: tickets?.filter(t => t.status === "open" || t.status === "yts").length || 0,
    inProgress: tickets?.filter(t => t.status === "in_progress").length || 0,
    completed: tickets?.filter(t => t.status === "completed" || t.status === "closed").length || 0,
  }), [tickets]);

  const exportData = filtered.map(t => ({
    "Ticket No": t.ticketNo, Subject: t.subject, Type: t.type, Status: t.status, Priority: t.priority,
    "Assigned To": t.assignedToName || "-", Project: t.projectName || "-",
    "Created Date": t.createdAt, "Due Date": t.dueDate || "-",
  }));
  const exportHeaders = ["Ticket No", "Subject", "Type", "Status", "Priority", "Assigned To", "Project", "Created Date", "Due Date"];
  const exportKeys = exportHeaders;

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey({ search, myTickets }) });

  const handleEditSave = (values: TicketEditValues) => {
    if (!editingTicket) return;
    updateTicket.mutate({
      id: editingTicket.id,
      data: {
        subject: values.subject,
        description: values.description || undefined,
        priority: values.priority,
        categoryId: values.categoryId ? Number(values.categoryId) : undefined,
        subCategoryId: values.subCategoryId ? Number(values.subCategoryId) : undefined,
        dueDate: values.dueDate || undefined,
      } as any,
    }, {
      onSuccess: () => {
        updateStatus.mutate({ id: editingTicket.id, data: { status: values.status, remarks: "Updated from edit dialog" } }, {
          onSuccess: () => {
            toast.success("Ticket updated");
            setEditingTicket(null);
            refresh();
          },
          onError: () => toast.error("Ticket saved, but status update failed"),
        });
      },
      onError: () => toast.error("Failed to update ticket"),
    });
  };

  return (
    <AppLayout title="My Tickets">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">My Tickets</h2>
            <p className="text-muted-foreground text-sm">Tickets assigned to or created by you.</p>
          </div>
          <Link href="/tickets/new">
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Raise Ticket</Button>
          </Link>
        </div>

        <ModuleStats
          stats={[
            { label: "Total Tickets", value: counts.all, icon: Ticket, tone: "sky", active: statusFilter === "all", onClick: () => { setStatusFilter("all"); setPage(1); } },
            { label: "Open / YTS", value: counts.open, icon: Clock, tone: "amber", active: statusFilter === "open", onClick: () => { setStatusFilter("open"); setPage(1); } },
            { label: "In Progress", value: counts.inProgress, icon: PlayCircle, tone: "violet", active: statusFilter === "in_progress", onClick: () => { setStatusFilter("in_progress"); setPage(1); } },
            { label: "Completed", value: counts.completed, icon: CheckCircle2, tone: "emerald", active: statusFilter === "completed", onClick: () => { setStatusFilter("completed"); setPage(1); } },
          ]}
        />

        {/* Filters */}
        <Card className="border-slate-200">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search tickets..." className="pl-9 h-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-38"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="yts">Yet to Start</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="forwarded">Forwarded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-34"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant={myTickets ? "secondary" : "outline"} size="sm" className="h-9" onClick={() => { setMyTickets(!myTickets); setPage(1); }}>
                {myTickets ? "My Tickets" : "All Tickets"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <TicketTable
            tickets={paged}
            isLoading={isLoading}
            onView={(ticket) => setLocation(`/tickets/${ticket.id}`)}
            onEdit={setEditingTicket}
            onAudit={setAuditTicket}
            onReminder={setReminderTicket}
            onComment={(ticket) => { setActionTicket(ticket); setActionType("comment"); }}
            onReassign={(ticket) => { setActionTicket(ticket); setActionType("reassign"); }}
            onForwardDepartment={(ticket) => { setActionTicket(ticket); setActionType("forwardDepartment"); }}
          />
          <TableControls
            total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}
            exportData={exportData} exportHeaders={exportHeaders} exportKeys={exportKeys}
            exportFilename="tickets" exportTitle="Tickets Report"
          />
        </Card>
        <TicketEditDialog
          open={!!editingTicket}
          onOpenChange={(open) => !open && setEditingTicket(null)}
          ticket={editingTicket}
          onSave={handleEditSave}
          isSaving={updateTicket.isPending || updateStatus.isPending}
        />
        <AuditLogDialog
          open={!!auditTicket}
          onOpenChange={(open) => !open && setAuditTicket(null)}
          entityType="ticket"
          entityId={auditTicket?.id ?? null}
          title={`Audit Logs${auditTicket ? ` - ${auditTicket.ticketNo}` : ""}`}
        />
        <ReminderDialog
          target={reminderTicket ? { entityType: "ticket", entityId: reminderTicket.id, reference: reminderTicket.ticketNo, title: reminderTicket.subject } : null}
          onOpenChange={(open) => !open && setReminderTicket(null)}
        />
        <TicketActionDialog
          ticket={actionTicket}
          action={actionType}
          onOpenChange={(open) => { if (!open) { setActionTicket(null); setActionType(null); } }}
          onSaved={refresh}
        />
      </div>
    </AppLayout>
  );
}
