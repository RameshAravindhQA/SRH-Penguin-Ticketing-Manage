import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetProject, getGetProjectQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ProgressCircle } from "@/components/projects/ProjectCard";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Tag, Briefcase } from "lucide-react";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const { data: project, isLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) }
  });

  if (isLoading) {
    return (
      <AppLayout title="Loading Project...">
        <div className="space-y-6 p-6">
          <Skeleton className="h-32 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout title="Project Not Found">
        <div className="p-12 text-center">Project not found</div>
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
          </div>
        </div>

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
      </div>
    </AppLayout>
  );
}
