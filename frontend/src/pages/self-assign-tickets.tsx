import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ModuleStats } from "@/components/shared/ModuleStats";
import { AuditLogDialog } from "@/components/shared/AuditLogDialog";
import { ReminderDialog } from "@/components/shared/ReminderDialog";
import { RowActions } from "@/components/shared/RowActions";
import { ExportMenu, TableControls, usePagination } from "@/components/shared/TableControls";
import { TicketEditDialog, TicketEditValues } from "@/components/tickets/TicketEditDialog";
import { TicketActionDialog } from "@/components/tickets/TicketActionDialogs";
import { AttachmentPicker } from "@/components/tickets/TicketAttachments";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/tickets/TicketStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  getListTicketsQueryKey,
  Ticket,
  useCreateTicket,
  useGetMe,
  useListCategories,
  useListTickets,
  useListUsers,
  useUpdateTicket,
  useUpdateTicketStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, Clock, Plus, Search, TicketCheck, TimerReset } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { listSubCategories, listTicketTypes } from "@/lib/master-data";
import { uploadTicketAttachments, type AttachmentUploadFile } from "@/lib/ticket-attachments";

type TicketFormState = {
  subject: string;
  description: string;
  priority: string;
  type: string;
  categoryId: string;
  subCategoryId: string;
  assignedToId: string;
  dueDate: string;
};

const emptyForm: TicketFormState = {
  subject: "",
  description: "",
  priority: "medium",
  type: "incident",
  categoryId: "",
  subCategoryId: "",
  assignedToId: "",
  dueDate: "",
};

function TicketDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  initial: TicketFormState;
  onSubmit: (values: TicketFormState & { attachments?: AttachmentUploadFile[] }) => void;
  isSaving: boolean;
}) {
  const { data: categories } = useListCategories();
  const { data: users } = useListUsers();
  const { data: ticketTypes } = useQuery({ queryKey: ["ticket-types"], queryFn: listTicketTypes });
  const { data: subCategories } = useQuery({ queryKey: ["sub-categories"], queryFn: listSubCategories });
  const [form, setForm] = useState<TicketFormState>(initial);
  const [attachments, setAttachments] = useState<AttachmentUploadFile[]>([]);
  const filteredSubCategories = (subCategories || []).filter(sub => !form.categoryId || sub.categoryId === Number(form.categoryId));
  const leaderUsers = (users || []).filter(user => {
    const role = String(user.role || "").toLowerCase();
    const designation = String(user.designation || "").toLowerCase();
    return role.includes("lead") || role.includes("manager") || designation.includes("lead") || designation.includes("manager");
  });
  const assignUsers = leaderUsers.length ? leaderUsers : (users || []);

  React.useEffect(() => {
    if (open) {
      setForm(initial);
      setAttachments([]);
    }
  }, [initial, open]);

  const set = (key: keyof TicketFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const setSelect = (key: keyof TicketFormState) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial.subject ? "Edit Self Assigned Ticket" : "Create Self Assigned Ticket"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={form.subject} onChange={set("subject")} placeholder="Brief ticket summary" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={setSelect("type")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(ticketTypes?.length ? ticketTypes : [
                    { id: 1, name: "Normal Ticket", code: "normal" },
                    { id: 2, name: "Routine Ticket", code: "routine" },
                  ]).map(ticketType => (
                    <SelectItem key={ticketType.id} value={ticketType.code}>{ticketType.name}</SelectItem>
                  ))}
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
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={set("dueDate")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assign Team Leader / Manager</Label>
            <Select value={form.assignedToId || "self"} onValueChange={(value) => setForm((current) => ({ ...current, assignedToId: value === "self" ? "" : value }))}>
              <SelectTrigger><SelectValue placeholder="Select team leader or manager" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Assign to me</SelectItem>
                {assignUsers.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.categoryId || "none"} onValueChange={(value) => setForm((current) => ({ ...current, categoryId: value === "none" ? "" : value }))}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Category</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sub Category</Label>
            <Select value={form.subCategoryId || "none"} onValueChange={(value) => setForm((current) => ({ ...current, subCategoryId: value === "none" ? "" : value }))}>
              <SelectTrigger><SelectValue placeholder="Select sub category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Sub Category</SelectItem>
                {filteredSubCategories.map((sub) => (
                  <SelectItem key={sub.id} value={String(sub.id)}>{sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={set("description")} className="min-h-[110px]" placeholder="Ticket details, steps, or business context" />
          </div>
          <AttachmentPicker files={attachments} onFilesChange={setAttachments} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => onSubmit({ ...form, attachments } as TicketFormState & { attachments: AttachmentUploadFile[] })}
            disabled={isSaving || form.subject.trim().length < 1}
          >
            {isSaving ? "Saving..." : "Save Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SelfAssignTicketsPage() {
  const { data: me } = useGetMe();
  const { data: tickets, isLoading } = useListTickets({ myTickets: true });
  const createTicket = useCreateTicket();
  const updateTicket = useUpdateTicket();
  const updateTicketStatus = useUpdateTicketStatus();
  const queryClient = useQueryClient();
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [auditTicket, setAuditTicket] = useState<Ticket | null>(null);
  const [reminderTicket, setReminderTicket] = useState<Ticket | null>(null);
  const [actionTicket, setActionTicket] = useState<Ticket | null>(null);
  const [actionType, setActionType] = useState<"comment" | "reassign" | "forwardDepartment" | null>(null);
  const [, setLocation] = useLocation();

  const selfAssigned = useMemo(() => {
    return (tickets || []).filter((ticket) => ticket.createdById === me?.id || ticket.assignedToId === me?.id);
  }, [me?.id, tickets]);

  const filtered = useMemo(() => {
    return selfAssigned.filter((ticket) => {
      if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
      if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        if (!ticket.subject.toLowerCase().includes(term) && !ticket.ticketNo.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [priorityFilter, search, selfAssigned, statusFilter]);

  const paged = paginate(filtered);

  const counts = useMemo(() => ({
    all: selfAssigned.length,
    inProgress: selfAssigned.filter((ticket) => ticket.status === "in_progress").length,
    pending: selfAssigned.filter((ticket) => ticket.status === "pending" || ticket.status === "hold").length,
    done: selfAssigned.filter((ticket) => ticket.status === "completed" || ticket.status === "closed").length,
  }), [selfAssigned]);

  const invalidateTickets = () => {
    queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey({ myTickets: true }) });
  };

  const openCreate = () => {
    setDialogOpen(true);
  };

  const saveTicket = (values: TicketFormState & { attachments?: AttachmentUploadFile[] }) => {
    if (!me?.id) {
      toast.error("Current user not loaded");
      return;
    }
    const payload = {
      subject: values.subject.trim(),
      description: values.description.trim() || undefined,
      priority: values.priority,
      categoryId: values.categoryId ? Number(values.categoryId) : undefined,
      subCategoryId: values.subCategoryId ? Number(values.subCategoryId) : undefined,
      dueDate: values.dueDate || undefined,
    } as any;

    createTicket.mutate({
      data: {
        ...payload,
        type: values.type,
        assignedToId: values.assignedToId ? Number(values.assignedToId) : me.id,
      },
    }, {
      onSuccess: (ticket) => {
        const complete = () => {
          toast.success("Self assigned ticket created");
          setDialogOpen(false);
          invalidateTickets();
        };
        if (values.attachments?.length) {
          uploadTicketAttachments(ticket.id, values.attachments)
            .then(complete)
            .catch(() => {
              toast.error("Ticket created, but attachment upload failed");
              complete();
            });
        } else {
          complete();
        }
      },
      onError: () => toast.error("Failed to create ticket"),
    });
  };

  const saveEdit = (values: TicketEditValues) => {
    if (!editing) return;
    updateTicket.mutate({
      id: editing.id,
      data: {
        subject: values.subject,
        description: values.description || undefined,
        priority: values.priority,
        categoryId: values.categoryId ? Number(values.categoryId) : undefined,
        subCategoryId: values.subCategoryId ? Number(values.subCategoryId) : undefined,
        dueDate: values.dueDate || undefined,
        expectedCloseDate: values.expectedCloseDate || undefined,
        sourceDepartment: values.sourceDepartment || undefined,
        serviceType: values.serviceType || undefined,
        location: values.location || undefined,
        systemType: values.systemType || undefined,
        systemSubType: values.systemSubType || undefined,
        reviewSchedule: values.reviewSchedule ? Number(values.reviewSchedule) : undefined,
        reviewDuration: values.reviewDuration || undefined,
        isExternal: values.isExternal === "true",
        organizationName: values.organizationName || undefined,
        providerName: values.providerName || undefined,
        externalPersonRole: values.externalPersonRole || undefined,
        externalPhoneNo: values.externalPhoneNo || undefined,
        supportingPerson: values.supportingPerson || undefined,
      } as any,
    }, {
      onSuccess: () => {
        updateTicketStatus.mutate({ id: editing.id, data: { status: values.status, remarks: "Updated from self assign edit" } }, {
          onSuccess: () => {
            toast.success("Ticket updated");
            setEditing(null);
            invalidateTickets();
          },
          onError: () => toast.error("Ticket saved, but status update failed"),
        });
      },
      onError: () => toast.error("Failed to update ticket"),
    });
  };

  const exportData = filtered.map((ticket) => ({
    "Ticket No": ticket.ticketNo,
    Subject: ticket.subject,
    Status: ticket.status,
    Priority: ticket.priority,
    Category: ticket.category || "-",
    "Due Date": ticket.dueDate || "-",
    "Created Date": ticket.createdAt,
  }));
  const exportHeaders = ["Ticket No", "Subject", "Status", "Priority", "Category", "Due Date", "Created Date"];

  return (
    <AppLayout title="Self Assign Tickets">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Self Assign Tickets</h2>
            <p className="text-sm text-muted-foreground">Create, own, update, and close tickets assigned directly to yourself.</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu exportData={exportData} exportHeaders={exportHeaders} exportKeys={exportHeaders} exportFilename="self-assign-tickets" exportTitle="Self Assign Tickets" />
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Self Ticket
            </Button>
          </div>
        </div>

        <ModuleStats
          stats={[
            { label: "Self Tickets", value: counts.all, icon: TicketCheck, tone: "sky", active: statusFilter === "all", onClick: () => { setStatusFilter("all"); setPage(1); } },
            { label: "In Progress", value: counts.inProgress, icon: TimerReset, tone: "violet", active: statusFilter === "in_progress", onClick: () => { setStatusFilter("in_progress"); setPage(1); } },
            { label: "Pending / Hold", value: counts.pending, icon: Clock, tone: "amber" },
            { label: "Done", value: counts.done, icon: CheckCircle2, tone: "emerald" },
          ]}
        />

        <Card className="border-slate-200">
          <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-9 pl-9" placeholder="Search ticket no or subject..." />
            </div>
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="hold">Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="reopened">Reopened</SelectItem>
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
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-10 text-center text-muted-foreground">Loading self assigned tickets...</div>
            ) : !paged.length ? (
              <div className="p-12 text-center text-muted-foreground">No self assigned tickets match your filters.</div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-sm font-medium text-primary">
                        <Link href={`/tickets/${ticket.id}`} className="hover:underline">{ticket.ticketNo}</Link>
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate font-medium" title={ticket.subject}>{ticket.subject}</TableCell>
                      <TableCell><TicketStatusBadge status={ticket.status} /></TableCell>
                      <TableCell><TicketPriorityBadge priority={ticket.priority} /></TableCell>
                      <TableCell>{ticket.category ? <Badge variant="outline">{ticket.category}</Badge> : "-"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {ticket.dueDate ? format(new Date(ticket.dueDate), "dd MMM yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        <RowActions
                          onView={() => setLocation(`/tickets/${ticket.id}`)}
                          onEdit={() => setEditing(ticket)}
                          onReminder={() => setReminderTicket(ticket)}
                          onAudit={() => setAuditTicket(ticket)}
                          onComment={() => { setActionTicket(ticket); setActionType("comment"); }}
                          onReassign={() => { setActionTicket(ticket); setActionType("reassign"); }}
                          onForwardDepartment={() => { setActionTicket(ticket); setActionType("forwardDepartment"); }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <TableControls
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            exportData={exportData}
            exportHeaders={exportHeaders}
            exportKeys={exportHeaders}
            exportFilename="self-assign-tickets"
            exportTitle="Self Assign Tickets"
          />
        </Card>

        <TicketDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initial={emptyForm}
          onSubmit={saveTicket}
          isSaving={createTicket.isPending}
        />
        <TicketEditDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          ticket={editing}
          onSave={saveEdit}
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
          onSaved={invalidateTickets}
        />
      </div>
    </AppLayout>
  );
}
