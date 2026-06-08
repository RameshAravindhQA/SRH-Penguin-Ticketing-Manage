import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/TicketStatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Ticket } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";

interface TeamTicketsTableProps {
  tickets: Ticket[];
  isLoading?: boolean;
}

export function TeamTicketsTable({ tickets, isLoading }: TeamTicketsTableProps) {
  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading tickets...</div>;
  }

  if (!tickets || tickets.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No tickets found.</div>;
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow>
            <TableHead>Ticket No</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Member</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
              <TableCell className="max-w-[200px] truncate font-medium" title={ticket.subject}>
                {ticket.subject}
              </TableCell>
              <TableCell>{ticket.type || "-"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={ticket.assignedToAvatar || ""} />
                    <AvatarFallback className="text-[10px]">
                      {ticket.assignedToName?.substring(0, 2).toUpperCase() || "UN"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{ticket.assignedToName || "Unassigned"}</span>
                </div>
              </TableCell>
              <TableCell>
                <TicketStatusBadge status={ticket.status} />
              </TableCell>
              <TableCell>
                <TicketPriorityBadge priority={ticket.priority} />
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
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
