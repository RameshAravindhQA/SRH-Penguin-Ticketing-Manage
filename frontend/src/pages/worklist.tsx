import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Ticket, useGetWorklist, usePickTicket, useListCategories, getGetWorklistQueryKey, useUpdateTicket, useUpdateTicketStatus } from "@workspace/api-client-react";
import { TicketTable } from "@/components/tickets/TicketTable";
import { TicketEditDialog, TicketEditValues } from "@/components/tickets/TicketEditDialog";
import { TicketActionDialog } from "@/components/tickets/TicketActionDialogs";
import { AuditLogDialog } from "@/components/shared/AuditLogDialog";
import { ReminderDialog } from "@/components/shared/ReminderDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, RefreshCw, Inbox, Clock, AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TableControls, usePagination } from "@/components/shared/TableControls";
import { ModuleStats } from "@/components/shared/ModuleStats";
import { useLocation } from "wouter";

export default function WorklistPage() {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeCard, setActiveCard] = useState("all");
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [auditTicket, setAuditTicket] = useState<Ticket | null>(null);
  const [reminderTicket, setReminderTicket] = useState<Ticket | null>(null);
  const [actionTicket, setActionTicket] = useState<Ticket | null>(null);
  const [actionType, setActionType] = useState<"comment" | "reassign" | "forwardDepartment" | null>(null);

  const { data: allTickets, isLoading, refetch } = useGetWorklist({ search });
  const { data: categories } = useListCategories();
  const pickTicket = usePickTicket();
  const updateTicket = useUpdateTicket();
  const updateTicketStatus = useUpdateTicketStatus();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const handlePickTicket = (ticketId: number) => {
    pickTicket.mutate({ id: ticketId }, {
      onSuccess: () => { toast.success("Ticket picked"); queryClient.invalidateQueries({ queryKey: getGetWorklistQueryKey({}) }); },
      onError: () => toast.error("Failed to pick ticket"),
    });
  };

  const refreshWorklist = () => queryClient.invalidateQueries({ queryKey: getGetWorklistQueryKey({}) });

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
        updateTicketStatus.mutate({ id: editingTicket.id, data: { status: values.status, remarks: "Updated from worklist edit" } }, {
          onSuccess: () => {
            toast.success("Ticket updated");
            setEditingTicket(null);
            refreshWorklist();
          },
          onError: () => toast.error("Ticket saved, but status update failed"),
        });
      },
      onError: () => toast.error("Failed to update ticket"),
    });
  };

  const filtered = useMemo(() => {
    let data = allTickets || [];
    if (priority !== "all") data = data.filter(t => t.priority === priority);
    if (categoryId !== "all") data = data.filter(t => t.categoryId === Number(categoryId));
    if (activeCard === "high") data = data.filter(t => t.priority === "high" || t.priority === "critical");
    else if (activeCard !== "all") data = data.filter(t => t.status === activeCard);
    return data;
  }, [allTickets, priority, categoryId, activeCard]);

  const paged = paginate(filtered);

  const counts = useMemo(() => ({
    all: allTickets?.length || 0,
    yts: allTickets?.filter(t => t.status === "yts").length || 0,
    pending: allTickets?.filter(t => t.status === "pending").length || 0,
    high: allTickets?.filter(t => t.priority === "high" || t.priority === "critical").length || 0,
  }), [allTickets]);

  const exportData = filtered.map(t => ({
    "Ticket No": t.ticketNo, Subject: t.subject, Type: t.type, Priority: t.priority,
    Status: t.status, Category: t.category || "-", "Created Date": t.createdAt,
  }));
  const exportHeaders = ["Ticket No", "Subject", "Type", "Priority", "Status", "Category", "Created Date"];
  const exportKeys = ["Ticket No", "Subject", "Type", "Priority", "Status", "Category", "Created Date"];

  return (
    <AppLayout title="Common Worklist">
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Common Worklist</h2>
            <p className="text-muted-foreground text-sm">Pool of unassigned tickets — pick one to start working.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        <ModuleStats
          stats={[
            { label: "Total Pool", value: counts.all, icon: Inbox, tone: "sky", active: activeCard === "all", onClick: () => { setActiveCard("all"); setPage(1); } },
            { label: "Yet to Start", value: counts.yts, icon: Circle, tone: "amber", active: activeCard === "yts", onClick: () => { setActiveCard("yts"); setPage(1); } },
            { label: "Pending", value: counts.pending, icon: Clock, tone: "violet", active: activeCard === "pending", onClick: () => { setActiveCard("pending"); setPage(1); } },
            { label: "High Priority", value: counts.high, icon: AlertTriangle, tone: "rose", active: activeCard === "high", onClick: () => { setActiveCard("high"); setPage(1); } },
          ]}
        />

        {/* Filters */}
        <Card className="border-slate-200">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search by ticket no or subject..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={priority} onValueChange={v => { setPriority(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryId} onValueChange={v => { setCategoryId(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {(priority !== "all" || categoryId !== "all" || search || activeCard !== "all") && (
                <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setPriority("all"); setCategoryId("all"); setSearch(""); setActiveCard("all"); setPage(1); }}>
                  Reset filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <TicketTable
            tickets={paged}
            isLoading={isLoading}
            showPickAction
            onPickTicket={handlePickTicket}
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
            exportFilename="worklist" exportTitle="Common Worklist"
          />
        </Card>
        <TicketEditDialog
          open={!!editingTicket}
          onOpenChange={(open) => !open && setEditingTicket(null)}
          ticket={editingTicket}
          onSave={handleEditSave}
          isSaving={updateTicket.isPending || updateTicketStatus.isPending}
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
          onSaved={refreshWorklist}
        />
      </div>
    </AppLayout>
  );
}
