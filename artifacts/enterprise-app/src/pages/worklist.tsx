import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetWorklist, usePickTicket, getGetWorklistQueryKey } from "@workspace/api-client-react";
import { TicketTable } from "@/components/tickets/TicketTable";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function WorklistPage() {
  const [search, setSearch] = useState("");
  const { data: tickets, isLoading } = useGetWorklist({ search });
  const pickTicket = usePickTicket();
  const queryClient = useQueryClient();

  const handlePickTicket = (ticketId: number) => {
    pickTicket.mutate(
      { ticketId },
      {
        onSuccess: () => {
          toast.success("Ticket picked successfully");
          queryClient.invalidateQueries({ queryKey: getGetWorklistQueryKey({ search }) });
        },
        onError: () => {
          toast.error("Failed to pick ticket");
        }
      }
    );
  };

  return (
    <AppLayout title="Common Worklist">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Common Worklist</h2>
            <p className="text-muted-foreground text-sm">Pool of unassigned tickets ready to be picked up.</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search unassigned tickets..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <TicketTable 
          tickets={tickets || []} 
          isLoading={isLoading} 
          showPickAction 
          onPickTicket={handlePickTicket} 
        />
      </div>
    </AppLayout>
  );
}
