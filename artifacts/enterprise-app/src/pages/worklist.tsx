import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetWorklist, usePickTicket, useListCategories, getGetWorklistQueryKey } from "@workspace/api-client-react";
import { TicketTable } from "@/components/tickets/TicketTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, RefreshCw, Inbox, Clock, AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TableControls, usePagination } from "@/components/shared/TableControls";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export";

const STATUS_CARDS = [
  { key: "all", label: "Total Pool", color: "bg-blue-50 border-blue-200 text-blue-700", icon: Inbox, iconClass: "text-blue-500" },
  { key: "yts", label: "Yet to Start", color: "bg-amber-50 border-amber-200 text-amber-700", icon: Circle, iconClass: "text-amber-500" },
  { key: "pending", label: "Pending", color: "bg-orange-50 border-orange-200 text-orange-700", icon: Clock, iconClass: "text-orange-500" },
  { key: "high", label: "High Priority", color: "bg-red-50 border-red-200 text-red-700", icon: AlertTriangle, iconClass: "text-red-500" },
];

export default function WorklistPage() {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeCard, setActiveCard] = useState("all");

  const { data: allTickets, isLoading, refetch } = useGetWorklist({ search });
  const { data: categories } = useListCategories();
  const pickTicket = usePickTicket();
  const queryClient = useQueryClient();
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const handlePickTicket = (ticketId: number) => {
    pickTicket.mutate({ id: ticketId }, {
      onSuccess: () => { toast.success("Ticket picked"); queryClient.invalidateQueries({ queryKey: getGetWorklistQueryKey({}) }); },
      onError: () => toast.error("Failed to pick ticket"),
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

        {/* Status Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_CARDS.map(card => {
            const Icon = card.icon;
            const count = counts[card.key as keyof typeof counts];
            const isActive = activeCard === card.key;
            return (
              <button
                key={card.key}
                onClick={() => { setActiveCard(card.key); setPage(1); }}
                className={`rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${isActive ? card.color + " shadow-md" : "bg-white border-slate-200 hover:border-slate-300"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${isActive ? card.iconClass : "text-muted-foreground"}`} />
                  {isActive && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div className={`text-2xl font-bold ${isActive ? "" : "text-foreground"}`}>{count}</div>
                <div className={`text-xs font-medium mt-0.5 ${isActive ? "" : "text-muted-foreground"}`}>{card.label}</div>
              </button>
            );
          })}
        </div>

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
          <TicketTable tickets={paged} isLoading={isLoading} showPickAction onPickTicket={handlePickTicket} />
          <TableControls
            total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}
            exportData={exportData} exportHeaders={exportHeaders} exportKeys={exportKeys}
            exportFilename="worklist" exportTitle="Common Worklist"
          />
        </Card>
      </div>
    </AppLayout>
  );
}
