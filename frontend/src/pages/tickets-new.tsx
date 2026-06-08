import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateTicket, useListCategories, useListUsers } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2, PlayCircle, Plus, Search, Ticket as TicketIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listSubCategories, listTicketTypes } from "@/lib/master-data";
import { useListTickets } from "@workspace/api-client-react";
import { TicketTable } from "@/components/tickets/TicketTable";
import { AttachmentPicker } from "@/components/tickets/TicketAttachments";
import { ExportMenu, TableControls, usePagination } from "@/components/shared/TableControls";
import { ModuleStats } from "@/components/shared/ModuleStats";
import { uploadTicketAttachments, type AttachmentUploadFile } from "@/lib/ticket-attachments";

const ticketSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional(),
  priority: z.string().min(1, "Priority is required"),
  type: z.string().min(1, "Type is required"),
  categoryId: z.coerce.number().optional(),
  subCategoryId: z.coerce.number().optional(),
  assignedToId: z.coerce.number().optional(),
  dueDate: z.string().optional(),
  expectedCloseDate: z.string().optional(),
});

export default function RaiseTicketPage() {
  const [_, setLocation] = useLocation();
  const [formOpen, setFormOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [attachments, setAttachments] = React.useState<AttachmentUploadFile[]>([]);
  const createTicket = useCreateTicket();
  const { data: categories } = useListCategories();
  const { data: users } = useListUsers();
  const { data: ticketTypes } = useQuery({ queryKey: ["ticket-types"], queryFn: listTicketTypes });
  const { data: subCategories } = useQuery({ queryKey: ["sub-categories"], queryFn: listSubCategories });
  const { data: tickets, isLoading: ticketsLoading } = useListTickets({ myTickets: true });
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: "",
      description: "",
      priority: "medium",
      type: "normal",
    },
  });

  const selectedCategoryId = form.watch("categoryId");
  const filteredSubCategories = (subCategories || []).filter(s => !selectedCategoryId || s.categoryId === Number(selectedCategoryId));
  const filteredTickets = (tickets || []).filter(ticket => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
    if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      if (!ticket.ticketNo.toLowerCase().includes(term) && !ticket.subject.toLowerCase().includes(term)) return false;
    }
    return true;
  });
  const recentTickets = paginate(filteredTickets);
  const counts = React.useMemo(() => ({
    all: tickets?.length || 0,
    open: tickets?.filter(ticket => ticket.status === "open" || ticket.status === "yts").length || 0,
    inProgress: tickets?.filter(ticket => ticket.status === "in_progress").length || 0,
    completed: tickets?.filter(ticket => ticket.status === "completed" || ticket.status === "closed").length || 0,
  }), [tickets]);
  const exportData = filteredTickets.map(ticket => ({
    "Ticket No": ticket.ticketNo,
    Subject: ticket.subject,
    Type: ticket.type || "-",
    Status: ticket.status,
    Priority: ticket.priority,
    Category: ticket.category || "-",
    "Sub Category": (ticket as any).subCategory || "-",
    "Assigned To": ticket.assignedToName || "-",
    "Created Date": ticket.createdAt,
    "Due Date": ticket.dueDate || "-",
  }));
  const exportHeaders = ["Ticket No", "Subject", "Type", "Status", "Priority", "Category", "Sub Category", "Assigned To", "Created Date", "Due Date"];

  const onSubmit = (values: z.infer<typeof ticketSchema>) => {
    const payload = { ...values };
    createTicket.mutate(
      { data: payload as any },
      {
        onSuccess: (data) => {
          const complete = () => {
            toast.success(`Ticket ${data.ticketNo} created successfully`);
            setAttachments([]);
            setFormOpen(false);
            form.reset({ subject: "", description: "", priority: "medium", type: "normal" });
            setLocation(`/tickets/${data.id}`);
          };
          if (attachments.length) {
            uploadTicketAttachments(data.id, attachments)
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
      }
    );
  };

  return (
    <AppLayout title="Raise Ticket">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Raised Tickets</h2>
            <p className="text-sm text-muted-foreground">Review, filter, export, and create tickets.</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu
              exportData={exportData}
              exportHeaders={exportHeaders}
              exportKeys={exportHeaders}
              exportFilename="raised-tickets"
              exportTitle="Raised Tickets"
            />
            <Button size="sm" className="gap-2" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> Raise Ticket
            </Button>
          </div>
        </div>

        <ModuleStats
          stats={[
            { label: "Total Tickets", value: counts.all, icon: TicketIcon, tone: "sky", active: statusFilter === "all", onClick: () => { setStatusFilter("all"); setPage(1); } },
            { label: "Open / YTS", value: counts.open, icon: Clock, tone: "amber", active: statusFilter === "open", onClick: () => { setStatusFilter("open"); setPage(1); } },
            { label: "In Progress", value: counts.inProgress, icon: PlayCircle, tone: "violet", active: statusFilter === "in_progress", onClick: () => { setStatusFilter("in_progress"); setPage(1); } },
            { label: "Completed", value: counts.completed, icon: CheckCircle2, tone: "emerald", active: statusFilter === "completed", onClick: () => { setStatusFilter("completed"); setPage(1); } },
          ]}
        />

        <Card className="border-slate-200">
          <CardContent className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-9 pl-9" placeholder="Search ticket no or subject..." />
            </div>
            <Select value={statusFilter} onValueChange={value => { setStatusFilter(value); setPage(1); }}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="yts">YTS</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="hold">Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={value => { setPriorityFilter(value); setPage(1); }}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <TicketTable tickets={recentTickets} isLoading={ticketsLoading} />
          <TableControls
            total={filteredTickets.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            showExport={false}
          />
        </Card>

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Raise a New Ticket</DialogTitle>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="Brief summary of the issue" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type <span className="text-red-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(ticketTypes?.length ? ticketTypes : [
                            { id: 1, name: "Normal Ticket", code: "normal" },
                            { id: 2, name: "Routine Ticket", code: "routine" },
                          ]).map(t => <SelectItem key={t.id} value={t.code}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority <span className="text-red-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="subCategoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select sub category" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredSubCategories.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="assignedToId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select user (optional)" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.map(u => (
                            <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="expectedCloseDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Close Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Provide detailed information about the ticket..." className="min-h-[120px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <AttachmentPicker files={attachments} onFilesChange={setAttachments} />
              </CardContent>
              <CardFooter className="flex justify-end gap-3 border-t pt-6">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
                <Button type="submit" disabled={createTicket.isPending}>
                  {createTicket.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Ticket
                </Button>
              </CardFooter>
            </form>
          </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
