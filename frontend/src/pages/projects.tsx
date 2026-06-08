import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getListProjectsQueryKey, Project, useListProjects, useUpdateProject, useUpdateProjectProgress } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FolderKanban, LayoutGrid, List, PlayCircle, CheckCircle2, PauseCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { TableControls, usePagination } from "@/components/shared/TableControls";
import { ModuleStats } from "@/components/shared/ModuleStats";
import { RowActions } from "@/components/shared/RowActions";
import { AuditLogDialog } from "@/components/shared/AuditLogDialog";
import { ReminderDialog } from "@/components/shared/ReminderDialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { listSubCategories } from "@/lib/master-data";

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
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [auditProject, setAuditProject] = useState<Project | null>(null);
  const [reminderProject, setReminderProject] = useState<Project | null>(null);
  const { data: projects, isLoading } = useListProjects({ search, myProjects });
  const { data: subCategories } = useQuery({ queryKey: ["sub-categories"], queryFn: listSubCategories });
  const updateProject = useUpdateProject();
  const updateProgress = useUpdateProjectProgress();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);
  const [editForm, setEditForm] = useState({ title: "", status: "created", priority: "medium", subCategoryId: "", startDate: "", endDate: "", progress: "0" });

  const filtered = useMemo(() => {
    let data = projects || [];
    if (statusFilter !== "all") data = data.filter(p => p.status === statusFilter);
    if (priorityFilter !== "all") data = data.filter(p => p.priority === priorityFilter);
    return data;
  }, [projects, statusFilter, priorityFilter]);

  const paged = paginate(filtered);

  const counts = useMemo(() => ({
    all: projects?.length || 0,
    inProgress: projects?.filter(p => p.status === "in_progress").length || 0,
    completed: projects?.filter(p => p.status === "completed").length || 0,
    onHold: projects?.filter(p => p.status === "on_hold").length || 0,
  }), [projects]);

  const exportData = filtered.map(p => ({
    "Project No": p.projectNo, Title: p.title, Status: p.status, Priority: p.priority,
    Progress: `${p.progress}%`, Owner: p.ownerName || "-",
    "Start Date": p.startDate || "-", "End Date": p.endDate || "-",
  }));
  const exportHeaders = ["Project No", "Title", "Status", "Priority", "Progress", "Owner", "Start Date", "End Date"];
  const exportKeys = exportHeaders;

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setEditForm({
      title: project.title,
      status: project.status,
      priority: project.priority,
      subCategoryId: (project as any).subCategoryId ? String((project as any).subCategoryId) : "",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      progress: String(project.progress ?? 0),
    });
  };

  const refreshProjects = () => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey({ search, myProjects }) });

  const saveProject = () => {
    if (!editingProject) return;
    updateProject.mutate({
      id: editingProject.id,
      data: {
        title: editForm.title,
        status: editForm.status,
        priority: editForm.priority,
        subCategoryId: editForm.subCategoryId ? Number(editForm.subCategoryId) : undefined,
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
      } as any,
    }, {
      onSuccess: () => {
        updateProgress.mutate({ id: editingProject.id, data: { progress: Number(editForm.progress) } }, {
          onSuccess: () => {
            toast.success("Project updated");
            setEditingProject(null);
            refreshProjects();
          },
          onError: () => toast.error("Project saved, but progress update failed"),
        });
      },
      onError: () => toast.error("Failed to update project"),
    });
  };

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

        <ModuleStats
          stats={[
            { label: "Total Projects", value: counts.all, icon: FolderKanban, tone: "sky", active: statusFilter === "all", onClick: () => { setStatusFilter("all"); setPage(1); } },
            { label: "In Progress", value: counts.inProgress, icon: PlayCircle, tone: "violet", active: statusFilter === "in_progress", onClick: () => { setStatusFilter("in_progress"); setPage(1); } },
            { label: "Completed", value: counts.completed, icon: CheckCircle2, tone: "emerald", active: statusFilter === "completed", onClick: () => { setStatusFilter("completed"); setPage(1); } },
            { label: "On Hold", value: counts.onHold, icon: PauseCircle, tone: "amber", active: statusFilter === "on_hold", onClick: () => { setStatusFilter("on_hold"); setPage(1); } },
          ]}
        />

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
                  <TableHead>Sub Category</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="text-sm">{(p as any).subCategory || "-"}</TableCell>
                    <TableCell className="text-sm">{p.ownerName || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{p.startDate || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{p.endDate || "-"}</TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        onView={() => setLocation(`/projects/${p.id}`)}
                        onEdit={() => openEdit(p)}
                        onReminder={() => setReminderProject(p)}
                        onAudit={() => setAuditProject(p)}
                      />
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
        <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={status => setEditForm(f => ({ ...f, status }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created">Created</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="requirement_gathering">Requirement Gathering</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="uat">UAT</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="go_live">Go Live</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={editForm.priority} onValueChange={priority => setEditForm(f => ({ ...f, priority }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Progress</Label>
                  <Input type="number" min="0" max="100" value={editForm.progress} onChange={e => setEditForm(f => ({ ...f, progress: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Sub Category</Label>
                <Select value={editForm.subCategoryId || "none"} onValueChange={subCategoryId => setEditForm(f => ({ ...f, subCategoryId: subCategoryId === "none" ? "" : subCategoryId }))}>
                  <SelectTrigger><SelectValue placeholder="Select sub category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Sub Category</SelectItem>
                    {subCategories?.filter(sub => sub.type === "project" || sub.type === "general").map(sub => (
                      <SelectItem key={sub.id} value={String(sub.id)}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProject(null)}>Cancel</Button>
              <Button onClick={saveProject} disabled={updateProject.isPending || updateProgress.isPending}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AuditLogDialog
          open={!!auditProject}
          onOpenChange={(open) => !open && setAuditProject(null)}
          entityType="project"
          entityId={auditProject?.id ?? null}
          title={`Audit Logs${auditProject ? ` - ${auditProject.projectNo}` : ""}`}
        />
        <ReminderDialog
          target={reminderProject ? { entityType: "project", entityId: reminderProject.id, reference: reminderProject.projectNo, title: reminderProject.title } : null}
          onOpenChange={(open) => !open && setReminderProject(null)}
        />
      </div>
    </AppLayout>
  );
}
