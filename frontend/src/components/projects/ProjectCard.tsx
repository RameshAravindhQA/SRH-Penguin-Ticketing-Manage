import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Project } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Users, Calendar, Ticket } from "lucide-react";

function getStatusColor(status: string) {
  switch (status) {
    case "Not Started": return "bg-gray-100 text-gray-700";
    case "In Progress": return "bg-blue-100 text-blue-700";
    case "On Hold": return "bg-yellow-100 text-yellow-700";
    case "Completed": return "bg-green-100 text-green-700";
    case "Cancelled": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

export function ProgressCircle({ progress = 0 }: { progress: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-12 h-12 transform -rotate-90">
        <circle
          className="text-slate-100"
          strokeWidth="4"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="24"
          cy="24"
        />
        <circle
          className="text-primary transition-all duration-300 ease-in-out"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="24"
          cy="24"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-foreground">
        {progress}%
      </span>
    </div>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200">
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">{project.projectNo}</span>
                <Badge variant="secondary" className={`text-[10px] uppercase font-bold border-none ${getStatusColor(project.status)}`}>
                  {project.status}
                </Badge>
              </div>
              <h3 className="font-semibold text-base leading-tight truncate text-foreground">{project.title}</h3>
            </div>
            <div className="shrink-0">
              <ProgressCircle progress={project.progress || 0} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span className="truncate">Due {project.endDate ? format(new Date(project.endDate), "MMM dd") : "-"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5" />
              <span>{project.ticketCount || 0} Tickets</span>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-between items-center mt-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Owner</span>
              <div className="flex items-center gap-1.5">
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                    {project.ownerName?.substring(0, 2).toUpperCase() || "UN"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-foreground truncate max-w-[100px]">{project.ownerName || "Unassigned"}</span>
              </div>
            </div>
            {project.collaborators && project.collaborators.length > 0 && (
              <div className="flex -space-x-2">
                {project.collaborators.slice(0, 3).map((c, i) => (
                  <Avatar key={i} className="w-6 h-6 border-2 border-white">
                    <AvatarFallback className="text-[9px] bg-slate-200 text-slate-700">
                      {c.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {project.collaborators.length > 3 && (
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600">
                    +{project.collaborators.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
