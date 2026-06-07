import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListProjects } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FolderKanban, LayoutGrid, List } from "lucide-react";
import { Link } from "wouter";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { TableControls, usePagination } from "@/components/shared/TableControls";
import { format } from "date-fns";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    created: "bg-slate-100 text-slate-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    on_hold: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return <Badge className={`border-0 text-xs capitalize ${map[status] || "bg-slate-100 text-slate-600"}`}>{status.replace("_", " ")}</Badge>;
}

function ProgressBar({ value }: { value: number | undefined }) {
  const pct = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8">{pct}%</span>
    </div>
  );
}

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [myProjects, setMyProjects] = useState(false);
  const [view, setView] = useState<"grid" | "table">("table");
  const { data: projects, isLoading } = useListProjects({ search, myProjects });
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const filtered = useMemo(() => {
    let data = projects || [];
    if (statusFilter !== "all") data = data.filter(p => p.status === statusFilter);
    if (priorityFilter !== "all") data = data.filter(p => p.priority === priorityFilter);
    return data;
  }, [projects, statusFilter, priorityFilter]);

  const paged = paginate(filtered);

  const exportData = filtered.map(p => ({
    "Project No": p.projectNo, Title: p.title, Status: p.status, Priority: p.priority,
    Progress: `${p.progress}%`, Owner: p.ownerName || "-",
    "Start Date": p.startDate || "-", "End Date": p.endDate || "-",
  }));
  const exportHeaders = ["Project No", "Title", "Status", "Priority", "Progress", "Owner", "Start Date", "End Date"];
  const exportKeys = exportHeaders;

  return (
    <AppLayout title="Projects">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Projects</h2>
            <p className="text-muted-foreground text-sm">Track enterprise projects and their progress.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md overflow-hidden">
              <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" className="rounded-none h-8 px-3 gap-1" onClick={() => setView("table")}><List className="w-4 h-4" /></Button>
              <Button variant={view === "grid" ? "secondary" : "ghost"} size="sm" className="rounded-none h-8 px-3 gap-1" onClick={() => setView("grid")}><LayoutGrid className="w-4 h-4" /></Button>
            </div>
            <Link href="/projects/new">
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />New Project</Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-slate-200">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search projects..." className="pl-9 h-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-34"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={myProjects ? "secondary" : "outline"} size="sm" className="h-9" onClick={() => { setMyProjects(!myProjects); setPage(1); }}>
                {myProjects ? "My Projects" : "All Projects"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="p-12 flex justify-center text-muted-foreground">Loading projects...</div>
        ) : !filtered.length ? (
          <div className="p-12 border border-dashed rounded-lg bg-slate-50 flex flex-col items-center justify-center text-center">
            <FolderKanban className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-1">No projects found</h3>
            <p className="text-muted-foreground mb-4">Create a new project to get started.</p>
            <Link href="/projects/new"><Button>Create Project</Button></Link>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map(project => <ProjectCard key={project.id} project={project} />)}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Project No</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm text-primary font-medium">
                      <Link href={`/projects/${p.id}`} className="hover:underline">{p.projectNo}</Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium" title={p.title}>{p.title}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell><span className={`text-xs font-bold uppercase ${p.priority === "high" ? "text-red-600" : p.priority === "medium" ? "text-amber-600" : "text-green-600"}`}>{p.priority}</span></TableCell>
                    <TableCell className="min-w-[120px]"><ProgressBar value={p.progress ?? 0} /></TableCell>
                    <TableCell className="text-sm">{p.ownerName || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{p.startDate || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{p.endDate || "-"}</TableCell>
                    <TableCell>
                      <Link href={`/projects/${p.id}`}><Button variant="ghost" size="sm" className="h-7 text-xs">View</Button></Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TableControls
              total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}
              exportData={exportData} exportHeaders={exportHeaders} exportKeys={exportKeys}
              exportFilename="projects" exportTitle="Projects Report"
            />
          </Card>
        )}
        {view === "grid" && filtered.length > 0 && (
          <TableControls
            total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}
            exportData={exportData} exportHeaders={exportHeaders} exportKeys={exportKeys}
            exportFilename="projects" exportTitle="Projects Report"
          />
        )}
      </div>
    </AppLayout>
  );
}
