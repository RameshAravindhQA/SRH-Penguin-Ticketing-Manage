import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetProject, getGetProjectQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ProgressCircle } from "@/components/projects/ProjectCard";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Tag, Briefcase, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ReminderDialog } from "@/components/shared/ReminderDialog";
import { exportToExcel, exportToPDF } from "@/lib/export";
import { exportProjectPDF } from "@/lib/projectExport";
import { projectFetch } from "@/lib/projectApi";
import { BellRing, Download, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollaboratorsPanel } from "@/components/projects/CollaboratorsPanel";
import { WorkflowBoard } from "@/components/projects/WorkflowBoard";
import { ActivityHistory } from "@/components/projects/ActivityHistory";

type ProjectComment = {
  id: number;
  content: string;
  authorId: number;
  authorName?: string | null;
  authorAvatar?: string | null;
  createdAt: string;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = React.useState("");
  const [reminderOpen, setReminderOpen] = React.useState(false);

  const { data: project, isLoading, isError } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) }
  });
  const commentsQueryKey = ["project-comments", id];
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: commentsQueryKey,
    enabled: !!id,
    queryFn: () => projectFetch<ProjectComment[]>(`/api/projects/${id}/comments`),
  });

  const addComment = async () => {
    if (!commentText.trim()) {
      toast.error("Comment is required");
      return;
    }
    try {
      await projectFetch<ProjectComment>(`/api/projects/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: commentText.trim() }),
      });
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      toast.success("Project comment added");
    } catch {
      toast.error("Failed to add project comment");
    }
  };

  const exportProject = () => {
    if (!project) return;
    const data = [{
      "Project No": project.projectNo,
      Title: project.title,
      Status: project.status,
      Priority: project.priority,
      Category: project.category || "-",
      "Sub Category": (project as any).subCategory || "-",
      Owner: project.ownerName || "-",
      "Process Owner": project.processOwnerName || "-",
      Progress: `${project.progress || 0}%`,
      "Start Date": project.startDate || "-",
      "End Date": project.endDate || "-",
      Description: project.description || "-",
    }];
    exportToExcel(data, `${project.projectNo}-details`, "Project Details");
    exportToPDF(data, Object.keys(data[0]), Object.keys(data[0]), `${project.projectNo}-details`, `Project Details - ${project.projectNo}`);
    toast.success("Project details exported");
  };

  const exportFullProjectReport = async () => {
    if (!project) return;
    try {
      const data = await projectFetch<any>(`/api/projects/${project.id}/export-data`);
      await exportProjectPDF(data);
      toast.success("Project report exported");
    } catch {
      toast.error("Failed to export project report");
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Loading Project...">
        <div className="space-y-6 p-6">
          <Skeleton className="h-32 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (isError || !project) {
    return (
      <AppLayout title="Project Not Found">
        <div className="rounded-md border bg-white p-12 text-center">
          <h2 className="text-lg font-semibold">Project could not be opened</h2>
          <p className="mt-2 text-sm text-muted-foreground">The project may not exist, or the server returned an error.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`${project.projectNo} - ${project.title}`}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-md border shadow-sm">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.title}</h1>
              <Badge variant="outline">{project.status}</Badge>
              <Badge variant="destructive" className="bg-red-100 text-red-700 border-none">{project.priority}</Badge>
            </div>
            <p className="text-muted-foreground max-w-3xl">{project.description || "No description provided."}</p>
          </div>
          <div className="flex flex-col items-center bg-slate-50 p-4 rounded-md border shrink-0 min-w-[150px]">
            <span className="text-sm font-semibold text-muted-foreground mb-2">Overall Progress</span>
            <ProgressCircle progress={project.progress || 0} />
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setReminderOpen(true)}>
                <BellRing className="h-4 w-4" /> Reminder
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={exportProject}>
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={exportFullProjectReport}>
                <FileText className="h-4 w-4" /> Project PDF
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="activity">Activity History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="py-4 border-b">
                    <CardTitle className="text-base">Linked Tickets</CardTitle>
                  </CardHeader>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Tickets linked to this project will appear here.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-4 border-b">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Project Comments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-4 space-y-4">
                    <div className="space-y-3 rounded-md border bg-slate-50 p-3">
                      <Textarea
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        placeholder="Add project update, start/end time note, blocker, or follow-up..."
                        className="min-h-[82px] bg-white"
                      />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={addComment}>Add Comment</Button>
                      </div>
                    </div>
                    {commentsLoading ? (
                      <div className="text-sm text-muted-foreground">Loading comments...</div>
                    ) : !comments?.length ? (
                      <p className="text-sm text-muted-foreground">No project comments yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 bg-slate-50 p-3 rounded-md border border-slate-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{comment.authorName || "User"}</span>
                                <span className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), "dd MMM yyyy, h:mm a")}</span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader className="py-4 border-b">
                    <CardTitle className="text-base">Project Details</CardTitle>
                  </CardHeader>
                  <CardContent className="py-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Project Owner</p>
                        <p className="text-sm font-semibold">{project.ownerName || "Unassigned"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Process Owner</p>
                        <p className="text-sm font-semibold">{project.processOwnerName || "Unassigned"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Category</p>
                        <p className="text-sm font-semibold">{project.category || "-"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> Start Date</p>
                        <p className="text-sm font-semibold">{project.startDate ? format(new Date(project.startDate), "dd MMM yyyy") : "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> End Date</p>
                        <p className="text-sm font-semibold">{project.endDate ? format(new Date(project.endDate), "dd MMM yyyy") : "-"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="collaborators">
            <CollaboratorsPanel projectId={project.id} ownerId={project.ownerId ?? null} />
          </TabsContent>

          <TabsContent value="workflow">
            <WorkflowBoard projectId={project.id} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityHistory projectId={project.id} />
          </TabsContent>
        </Tabs>
      </div>
      <ReminderDialog
        target={reminderOpen ? { entityType: "project", entityId: project.id, reference: project.projectNo, title: project.title } : null}
        onOpenChange={(open) => !open && setReminderOpen(false)}
      />
    </AppLayout>
  );
}
