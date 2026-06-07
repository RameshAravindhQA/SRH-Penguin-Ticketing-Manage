import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListProjects } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, FolderKanban } from "lucide-react";
import { Link } from "wouter";
import { ProjectCard } from "@/components/projects/ProjectCard";

export default function ProjectsPage() {
  const [search, setSearch] = React.useState("");
  const { data: projects, isLoading } = useListProjects({ search });

  return (
    <AppLayout title="Projects">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Projects</h2>
            <p className="text-muted-foreground text-sm">Manage enterprise projects, deployments, and implementations.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search projects..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Link href="/projects/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">Loading projects...</div>
        ) : !projects || projects.length === 0 ? (
          <div className="p-12 border border-dashed rounded-lg bg-slate-50 flex flex-col items-center justify-center text-center">
            <FolderKanban className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-1">No projects found</h3>
            <p className="text-muted-foreground mb-4">Get started by creating a new project tracking initiative.</p>
            <Link href="/projects/new">
              <Button>Create Project</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
