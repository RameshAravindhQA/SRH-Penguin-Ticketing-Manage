import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListTickets } from "@workspace/api-client-react";
import { TicketTable } from "@/components/tickets/TicketTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { Link } from "wouter";

export default function TicketsPage() {
  const [search, setSearch] = useState("");
  const { data: tickets, isLoading } = useListTickets({ search, myTickets: true });

  return (
    <AppLayout title="My Tickets">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">My Tickets</h2>
            <p className="text-muted-foreground text-sm">Tickets assigned to you or created by you.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search my tickets..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Link href="/tickets/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Raise Ticket
              </Button>
            </Link>
          </div>
        </div>
        
        <TicketTable 
          tickets={tickets || []} 
          isLoading={isLoading} 
        />
      </div>
    </AppLayout>
  );
}
