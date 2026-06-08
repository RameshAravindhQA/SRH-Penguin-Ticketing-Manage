import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAddTicketComment, useGetTicket, getGetTicketQueryKey, getListTicketCommentsQueryKey, useListTicketComments, useUpdateTicketStatus } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/TicketStatusBadge";
import { ReminderDialog } from "@/components/shared/ReminderDialog";
import { TicketAttachments } from "@/components/tickets/TicketAttachments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { BellRing, Clock, Download, User, Briefcase, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { exportToExcel, exportToPDF } from "@/lib/export";

export default function TicketDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = React.useState("");
  const [reminderOpen, setReminderOpen] = React.useState(false);
  const addComment = useAddTicketComment();
  const updateStatus = useUpdateTicketStatus();

  const { data: ticket, isLoading } = useGetTicket(id, {
    query: { enabled: !!id, queryKey: getGetTicketQueryKey(id) }
  });

  const { data: comments } = useListTicketComments(id);

  const refreshTicket = () => {
    queryClient.invalidateQueries({ queryKey: getGetTicketQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListTicketCommentsQueryKey(id) });
  };

  const handleAddComment = () => {
    if (!commentText.trim()) {
      toast.error("Comment is required");
      return;
    }
    addComment.mutate({ id, data: { content: commentText.trim() } }, {
      onSuccess: () => {
        setCommentText("");
        refreshTicket();
        toast.success("Comment added");
      },
      onError: () => toast.error("Failed to add comment"),
    });
  };

  const handleStatus = (status: string, remarks: string) => {
    updateStatus.mutate({ id, data: { status, remarks } }, {
      onSuccess: () => {
        refreshTicket();
        toast.success(`Ticket moved to ${status.replace("_", " ")}`);
      },
      onError: () => toast.error("Failed to update ticket status"),
    });
  };

  const exportDetails = () => {
    if (!ticket) return;
    const data = [{
      "Ticket No": ticket.ticketNo,
      Subject: ticket.subject,
      Status: ticket.status,
      Priority: ticket.priority,
      Type: ticket.type,
      Category: ticket.category || "-",
      "Sub Category": (ticket as any).subCategory || "-",
      Reporter: ticket.createdByName || "-",
      Assignee: ticket.assignedToName || "-",
      Project: ticket.projectName || "-",
      "Due Date": ticket.dueDate || "-",
      Description: ticket.description || "-",
    }];
    exportToExcel(data, `${ticket.ticketNo}-details`, "Ticket Details");
    exportToPDF(data, Object.keys(data[0]), Object.keys(data[0]), `${ticket.ticketNo}-details`, `Ticket Details - ${ticket.ticketNo}`);
    toast.success("Ticket details exported");
  };

  if (isLoading) {
    return (
      <AppLayout title="Loading Ticket...">
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-2" />
            <Skeleton className="h-64 col-span-1" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout title="Ticket Not Found">
        <div className="text-center p-12">Ticket not found</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`${ticket.ticketNo} - ${ticket.subject}`}>
      <div className="flex flex-col gap-6">
        {/* Header Details */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white p-6 rounded-md border shadow-sm">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-foreground">{ticket.ticketNo}</span>
              <div className="flex items-center gap-1">
                <TicketStatusBadge status={ticket.status} />
              </div>
              <div className="flex items-center gap-1">
                Priority: <TicketPriorityBadge priority={ticket.priority} />
              </div>
              <div className="flex items-center gap-1">
                Type: <span className="font-medium text-foreground">{ticket.type}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={ticket.status} onValueChange={(status) => handleStatus(status, "Updated from ticket detail")}>
              <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yts">YTS</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="hold">Hold</SelectItem>
                <SelectItem value="verify_in_process">Verify In Process</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="reopened">Reopened</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setReminderOpen(true)}>
              <BellRing className="h-4 w-4" /> Reminder
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={exportDetails}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader className="py-4 border-b">
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent className="py-4 prose max-w-none">
                <p className="whitespace-pre-wrap">{ticket.description || "No description provided."}</p>
              </CardContent>
            </Card>

            <TicketAttachments ticketId={ticket.id} />

            {/* Comments */}
            <Card>
              <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Activity & Comments
                </CardTitle>
              </CardHeader>
              <CardContent className="py-4 space-y-4">
                <div className="space-y-3 rounded-md border bg-slate-50 p-3">
                  <Textarea
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Add a comment or update note..."
                    className="min-h-[82px] bg-white"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleAddComment} disabled={addComment.isPending}>
                      {addComment.isPending ? "Posting..." : "Add Comment"}
                    </Button>
                  </div>
                </div>
                {comments?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                ) : (
                  <div className="space-y-4">
                    {comments?.map((comment) => (
                      <div key={comment.id} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 bg-slate-50 p-3 rounded-md border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{comment.authorName}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.createdAt), "dd MMM yyyy, h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Properties Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="py-4 border-b">
                <CardTitle className="text-base">Properties</CardTitle>
              </CardHeader>
              <CardContent className="py-4 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><User className="w-4 h-4" /> Reporter</span>
                  <span className="font-medium">{ticket.createdByName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><User className="w-4 h-4" /> Assignee</span>
                  <span className="font-medium">{ticket.assignedToName || "Unassigned"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Briefcase className="w-4 h-4" /> Project</span>
                  <span className="font-medium">{ticket.projectName || "-"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Created</span>
                  <span className="font-medium">{format(new Date(ticket.createdAt), "dd MMM yyyy")}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Due Date</span>
                  <span className="font-medium">{ticket.dueDate ? format(new Date(ticket.dueDate), "dd MMM yyyy") : "-"}</span>
                </div>
                {ticket.pendingDays != null && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Aging</span>
                    <span className="font-medium">{ticket.pendingDays} Days</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 rounded-md bg-slate-50 p-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Resolution Days</div>
                    <div className="font-medium">{ticket.resolvedAt ? Math.max(0, Math.floor((new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / 86400000)) : "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Closed Days</div>
                    <div className="font-medium">{ticket.closedAt ? Math.max(0, Math.floor((new Date(ticket.closedAt).getTime() - new Date(ticket.createdAt).getTime()) / 86400000)) : "-"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <ReminderDialog
        target={reminderOpen ? { entityType: "ticket", entityId: ticket.id, reference: ticket.ticketNo, title: ticket.subject } : null}
        onOpenChange={(open) => !open && setReminderOpen(false)}
      />
    </AppLayout>
  );
}
