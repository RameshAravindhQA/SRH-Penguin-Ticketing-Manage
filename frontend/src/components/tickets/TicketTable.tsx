import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/TicketStatusBadge";
import { RowActions } from "@/components/shared/RowActions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Ticket } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Hand } from "lucide-react";

interface TicketTableProps {
  tickets: Ticket[];
  isLoading?: boolean;
  showPickAction?: boolean;
  onPickTicket?: (ticketId: number) => void;
  onView?: (ticket: Ticket) => void;
  onEdit?: (ticket: Ticket) => void;
  onAudit?: (ticket: Ticket) => void;
  onReminder?: (ticket: Ticket) => void;
  onComment?: (ticket: Ticket) => void;
  onReassign?: (ticket: Ticket) => void;
  onForwardDepartment?: (ticket: Ticket) => void;
}

export function TicketTable({ tickets, isLoading, showPickAction, onPickTicket, onView, onEdit, onAudit, onReminder, onComment, onReassign, onForwardDepartment }: TicketTableProps) {
  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading tickets...</div>;
  }

  if (!tickets || tickets.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No tickets found.</div>;
  }

  return (
    <div className="border rounded-md bg-white">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Ticket No</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Member</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Sub Category</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead>Due Date</TableHead>
            {(showPickAction || onView || onEdit || onAudit || onComment || onReassign || onForwardDepartment) && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>
                <Link href={`/tickets/${ticket.id}`} className="text-primary hover:underline font-medium">
                  {ticket.ticketNo}
                </Link>
              </TableCell>
              <TableCell className="max-w-[250px] truncate font-medium" title={ticket.subject}>
                {ticket.subject}
              </TableCell>
              <TableCell>{ticket.type || "-"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {ticket.assignedToId ? (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={ticket.assignedToAvatar || ""} />
                        <AvatarFallback className="text-[10px]">
                          {ticket.assignedToName?.substring(0, 2).toUpperCase() || "UN"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate max-w-[100px]">{ticket.assignedToName}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Unassigned</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <TicketStatusBadge status={ticket.status} />
              </TableCell>
              <TableCell>
                <TicketPriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell className="max-w-[120px] truncate" title={(ticket as any).subCategory || ""}>
                {(ticket as any).subCategory || "-"}
              </TableCell>
              <TableCell className="max-w-[120px] truncate" title={ticket.projectName || ""}>
                {ticket.projectName || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {format(new Date(ticket.createdAt), "dd MMM yyyy")}
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {ticket.dueDate ? format(new Date(ticket.dueDate), "dd MMM yyyy") : "-"}
              </TableCell>
              {(showPickAction || onView || onEdit || onAudit || onComment || onReassign || onForwardDepartment) && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onView && onEdit && onAudit && (
                      <RowActions
                        onView={() => onView(ticket)}
                        onEdit={() => onEdit(ticket)}
                        onAudit={() => onAudit(ticket)}
                        onReminder={onReminder ? () => onReminder(ticket) : undefined}
                        onComment={onComment ? () => onComment(ticket) : undefined}
                        onReassign={onReassign ? () => onReassign(ticket) : undefined}
                        onForwardDepartment={onForwardDepartment ? () => onForwardDepartment(ticket) : undefined}
                      />
                    )}
                    {showPickAction && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPickTicket && onPickTicket(ticket.id)}
                        className="h-8 gap-1"
                      >
                        <Hand className="w-3.5 h-3.5" />
                        Pick
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
