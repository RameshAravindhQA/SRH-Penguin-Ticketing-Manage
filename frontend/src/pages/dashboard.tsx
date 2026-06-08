import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { TeamTicketsTable } from "@/components/dashboard/TeamTicketsTable";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";
import { CalendarPanel } from "@/components/dashboard/CalendarPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  useGetDashboardStats, 
  useListTickets, 
  useListNotifications, 
  useListCalendarEvents,
  useGetMe
} from "@workspace/api-client-react";
import { 
  Inbox, 
  AlertCircle, 
  Clock, 
  Activity, 
  CheckCircle2, 
  Archive, 
  Briefcase, 
  Target 
} from "lucide-react";

export default function DashboardPage() {
  const { data: me } = useGetMe();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: notifications } = useListNotifications({ unreadOnly: false });
  const { data: calendarEvents } = useListCalendarEvents({});
  
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  
  // Mapping tabs to status filter for the API
  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (val === "all" || val === "projects") {
      setStatusFilter(undefined);
    } else {
      // mapping "open-yts" -> "Open (YTS)", etc. based on typical backend values
      const statusMap: Record<string, string> = {
        "open-yts": "yts",
        "pending": "pending",
        "in-progress": "in_progress",
        "completed": "completed",
        "closed": "closed"
      };
      setStatusFilter(statusMap[val]);
    }
  };

  const { data: tickets, isLoading: ticketsLoading } = useListTickets({
    status: statusFilter,
  });

  return (
    <AppLayout title="Dashboard">
      <div className="flex flex-col gap-6">
        {/* Filter Bar */}
        <Card className="rounded-md border shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1 w-[130px]">
                <span className="text-xs font-medium text-muted-foreground">From Date</span>
                <Input type="date" className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-1 w-[130px]">
                <span className="text-xs font-medium text-muted-foreground">To Date</span>
                <Input type="date" className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-1 w-[140px]">
                <span className="text-xs font-medium text-muted-foreground">Lead</span>
                <Select defaultValue="you">
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="you">You</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 w-[140px]">
                <span className="text-xs font-medium text-muted-foreground">Member</span>
                <Select>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 w-[140px]">
                <span className="text-xs font-medium text-muted-foreground">Ticket Type</span>
                <Select>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 w-[140px]">
                <span className="text-xs font-medium text-muted-foreground">Ticket Status</span>
                <Select>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 w-[120px]">
                <span className="text-xs font-medium text-muted-foreground">Priority</span>
                <Select>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 w-[140px]">
                <span className="text-xs font-medium text-muted-foreground">Project</span>
                <Select>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem></SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end gap-2 ml-auto mt-4 md:mt-0">
                <Button size="sm" className="h-8 bg-primary hover:bg-primary/90 text-xs px-4">Apply Filter</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs px-4">Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <StatCard title="Total Incoming" value={stats?.totalIncoming || 156} icon={Inbox} trend="12%" trendUp={true} />
          <StatCard title="Open (YTS)" value={stats?.openTickets || 38} icon={AlertCircle} trend="5%" trendUp={false} />
          <StatCard title="Pending" value={stats?.pendingTickets || 22} icon={Clock} trend="2%" trendUp={true} />
          <StatCard title="In Progress" value={stats?.inProgressTickets || 27} icon={Activity} trend="8%" trendUp={true} />
          <StatCard title="Completed" value={stats?.completedTickets || 79} icon={CheckCircle2} trend="15%" trendUp={true} />
          <StatCard title="Closed" value={stats?.closedTickets || 10} icon={Archive} trend="1%" trendUp={true} />
          <StatCard title="Projects Assigned" value={stats?.projectsAssigned || 12} icon={Briefcase} trend="3%" trendUp={true} />
          <StatCard title="Projects Completed" value={stats?.projectsCompleted || 6} icon={Target} trend="10%" trendUp={true} />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Area (Table) - spans 3 cols */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <Card className="flex-1 shadow-sm">
              <div className="border-b px-4">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="h-12 w-full justify-start rounded-none border-b bg-transparent p-0">
                    <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 font-semibold text-muted-foreground data-[state=active]:text-primary">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="open-yts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 font-semibold text-muted-foreground data-[state=active]:text-primary">
                      Open (YTS)
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 font-semibold text-muted-foreground data-[state=active]:text-primary">
                      Pending
                    </TabsTrigger>
                    <TabsTrigger value="in-progress" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 font-semibold text-muted-foreground data-[state=active]:text-primary">
                      In Progress
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 font-semibold text-muted-foreground data-[state=active]:text-primary">
                      Completed
                    </TabsTrigger>
                    <TabsTrigger value="closed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 font-semibold text-muted-foreground data-[state=active]:text-primary">
                      Closed
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 font-semibold text-muted-foreground data-[state=active]:text-primary">
                      Projects
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <CardContent className="p-0">
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Team Tickets</h3>
                  {activeTab === "projects" ? (
                    <div className="p-8 text-center text-muted-foreground border rounded-md">Project view coming soon...</div>
                  ) : (
                    <TeamTicketsTable tickets={tickets || []} isLoading={ticketsLoading} />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - spans 1 col */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <QuickActions />
            <NotificationsPanel notifications={notifications || []} />
            <CalendarPanel events={calendarEvents || []} />
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
