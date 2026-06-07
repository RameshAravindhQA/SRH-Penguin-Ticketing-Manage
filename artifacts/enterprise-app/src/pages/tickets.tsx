import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListTickets, useListCategories } from "@workspace/api-client-react";
import { TicketTable } from "@/components/tickets/TicketTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import { Link } from "wouter";
import { TableControls, usePagination } from "@/components/shared/TableControls";

export default function TicketsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [myTickets, setMyTickets] = useState(true);

  const { data: tickets, isLoading } = useListTickets({ search, myTickets });
  const { data: categories } = useListCategories();
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const filtered = useMemo(() => {
    let data = tickets || [];
    if (statusFilter !== "all") data = data.filter(t => t.status === statusFilter);
    if (priorityFilter !== "all") data = data.filter(t => t.priority === priorityFilter);
    if (categoryFilter !== "all") data = data.filter(t => t.categoryId === Number(categoryFilter));
    return data;
  }, [tickets, statusFilter, priorityFilter, categoryFilter]);

  const paged = paginate(filtered);

  const exportData = filtered.map(t => ({
    "Ticket No": t.ticketNo, Subject: t.subject, Type: t.type, Status: t.status, Priority: t.priority,
    "Assigned To": t.assignedToName || "-", Project: t.projectName || "-",
    "Created Date": t.createdAt, "Due Date": t.dueDate || "-",
  }));
  const exportHeaders = ["Ticket No", "Subject", "Type", "Status", "Priority", "Assigned To", "Project", "Created Date", "Due Date"];
  const exportKeys = exportHeaders;

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
          <TicketTable tickets={paged} isLoading={isLoading} />
          <TableControls
            total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}
            exportData={exportData} exportHeaders={exportHeaders} exportKeys={exportKeys}
            exportFilename="tickets" exportTitle="Tickets Report"
          />
        </Card>
      </div>
    </AppLayout>
  );
}
