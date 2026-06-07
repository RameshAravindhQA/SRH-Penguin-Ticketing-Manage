import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetTicket, getGetTicketQueryKey, useListTicketComments } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/TicketStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Clock, User, Briefcase, Calendar, MessageSquare } from "lucide-react";

export default function TicketDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const { data: ticket, isLoading } = useGetTicket(id, {
    query: { enabled: !!id, queryKey: getGetTicketQueryKey(id) }
  });

  const { data: comments } = useListTicketComments(id);

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

            {/* Comments */}
            <Card>
              <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Activity & Comments
                </CardTitle>
              </CardHeader>
              <CardContent className="py-4 space-y-4">
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
