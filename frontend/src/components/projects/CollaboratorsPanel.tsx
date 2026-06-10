import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useListUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Trash2, UserPlus } from "lucide-react";
import {
  projectFetch, PROJECT_ROLES, PROJECT_PERMISSIONS,
  type ProjectCollaborator, type ProjectPermission,
} from "@/lib/projectApi";
import { UserSelect } from "@/components/shared/UserSelect";

export function CollaboratorsPanel({ projectId, ownerId }: { projectId: number; ownerId: number | null }) {
  const queryClient = useQueryClient();
  const { data: users } = useListUsers();
  const { data: collaborators, isLoading } = useQuery({
    queryKey: ["project-collaborators", projectId],
    queryFn: () => projectFetch<ProjectCollaborator[]>(`/api/projects/${projectId}`).then((p: any) => p.collaborators as ProjectCollaborator[]),
  });

  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [selectedRole, setSelectedRole] = React.useState<string>("contributor");

  const existingIds = new Set([...(collaborators ?? []).map((c) => c.userId), ownerId].filter(Boolean));
  const availableUsers = (users ?? []).filter((u) => !existingIds.has(u.id));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["project-collaborators", projectId] });
    queryClient.invalidateQueries({ queryKey: ["getProject", projectId] });
  };

  const addCollaborator = async () => {
    if (!selectedUserId) {
      toast.error("Select a user to add");
      return;
    }
    try {
      await projectFetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        body: JSON.stringify({ userId: Number(selectedUserId), role: selectedRole }),
      });
      setSelectedUserId("");
      refresh();
      toast.success("Collaborator added");
    } catch {
      toast.error("Failed to add collaborator");
    }
  };

  const updateRole = async (userId: number, role: string) => {
    try {
      await projectFetch(`/api/projects/${projectId}/collaborators/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      refresh();
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  };

  const togglePermission = async (collab: ProjectCollaborator, permission: ProjectPermission) => {
    const has = collab.permissions.includes(permission);
    const next = has ? collab.permissions.filter((p) => p !== permission) : [...collab.permissions, permission];
    try {
      await projectFetch(`/api/projects/${projectId}/collaborators/${collab.userId}`, {
        method: "PATCH",
        body: JSON.stringify({ permissions: next }),
      });
      refresh();
    } catch {
      toast.error("Failed to update permissions");
    }
  };

  const removeCollaborator = async (userId: number) => {
    try {
      await projectFetch(`/api/projects/${projectId}/collaborators/${userId}`, { method: "DELETE" });
      refresh();
      toast.success("Collaborator removed");
    } catch {
      toast.error("Failed to remove collaborator");
    }
  };

  return (
    <Card>
      <CardHeader className="py-4 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" /> Collaborators &amp; Permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 rounded-md border bg-slate-50 p-3">
          <UserSelect users={availableUsers} value={selectedUserId} onChange={setSelectedUserId} className="sm:w-56" />
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="sm:w-40 bg-white">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_ROLES.filter((r) => r !== "owner").map((role) => (
                <SelectItem key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-2" onClick={addCollaborator}>
            <UserPlus className="w-4 h-4" /> Add
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading collaborators...</div>
        ) : !collaborators?.length ? (
          <p className="text-sm text-muted-foreground">No collaborators added yet.</p>
        ) : (
          <div className="space-y-3">
            {collaborators.map((collab) => (
              <div key={collab.userId} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>{collab.name?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{collab.name}</p>
                      <p className="text-xs text-muted-foreground">Added {collab.addedAt ? new Date(collab.addedAt).toLocaleDateString() : "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={collab.role} onValueChange={(role) => updateRole(collab.userId, role)}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCollaborator(collab.userId)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-11">
                  {PROJECT_PERMISSIONS.map((perm) => {
                    const active = collab.permissions.includes(perm);
                    return (
                      <Badge
                        key={perm}
                        variant={active ? "default" : "outline"}
                        className="cursor-pointer select-none capitalize"
                        onClick={() => togglePermission(collab, perm)}
                      >
                        {perm}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
