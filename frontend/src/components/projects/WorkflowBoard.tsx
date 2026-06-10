import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useListUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GitBranch, Plus, Play, CheckCircle2, Trash2, ArrowRight } from "lucide-react";
import { projectFetch, formatDuration, type WorkflowNode } from "@/lib/projectApi";
import { UserSelect } from "@/components/shared/UserSelect";

const STATUS_VARIANT: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
};

const NODE_TYPES = ["start", "task", "review", "approval", "end"];

export function WorkflowBoard({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { data: users } = useListUsers();
  const queryKey = ["project-workflow", projectId];
  const { data: nodes, isLoading } = useQuery({
    queryKey,
    queryFn: () => projectFetch<WorkflowNode[]>(`/api/projects/${projectId}/workflow`),
  });

  const [name, setName] = React.useState("");
  const [nodeType, setNodeType] = React.useState("task");
  const [assignedToId, setAssignedToId] = React.useState<string>("");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["project-activity", projectId] });
  };

  const addNode = async () => {
    if (!name.trim()) {
      toast.error("Node name is required");
      return;
    }
    try {
      await projectFetch(`/api/projects/${projectId}/workflow`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          nodeType,
          sequenceOrder: (nodes?.length ?? 0) + 1,
          assignedToId: assignedToId ? Number(assignedToId) : null,
        }),
      });
      setName("");
      setAssignedToId("");
      refresh();
      toast.success("Workflow node added");
    } catch {
      toast.error("Failed to add node");
    }
  };

  const startNode = async (nodeId: number) => {
    try {
      await projectFetch(`/api/projects/${projectId}/workflow/${nodeId}/start`, { method: "POST" });
      refresh();
      toast.success("Node started");
    } catch {
      toast.error("Failed to start node");
    }
  };

  const completeNode = async (nodeId: number) => {
    try {
      await projectFetch(`/api/projects/${projectId}/workflow/${nodeId}/complete`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      refresh();
      toast.success("Node completed");
    } catch {
      toast.error("Failed to complete node");
    }
  };

  const deleteNode = async (nodeId: number) => {
    try {
      await projectFetch(`/api/projects/${projectId}/workflow/${nodeId}`, { method: "DELETE" });
      refresh();
      toast.success("Node removed");
    } catch {
      toast.error("Failed to remove node");
    }
  };

  return (
    <Card>
      <CardHeader className="py-4 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="w-4 h-4" /> Workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 rounded-md border bg-slate-50 p-3">
          <Input
            placeholder="Node name (e.g. Initial Review)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white sm:flex-1"
          />
          <Select value={nodeType} onValueChange={setNodeType}>
            <SelectTrigger className="sm:w-36 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NODE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <UserSelect users={users} value={assignedToId} onChange={setAssignedToId} placeholder="Assign to (optional)" className="sm:w-44" />
          <Button size="sm" className="gap-2" onClick={addNode}>
            <Plus className="w-4 h-4" /> Add Node
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading workflow...</div>
        ) : !nodes?.length ? (
          <p className="text-sm text-muted-foreground">No workflow nodes defined yet. Add the first node above.</p>
        ) : (
          <div className="flex flex-wrap items-stretch gap-3">
            {nodes.map((node, idx) => (
              <React.Fragment key={node.id}>
                <div className="rounded-md border p-3 w-60 space-y-2 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate" title={node.name}>{node.name}</span>
                    <Badge className={STATUS_VARIANT[node.status] ?? "bg-slate-100 text-slate-700"}>{node.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{node.nodeType} · #{node.sequenceOrder}</p>
                  <p className="text-xs text-muted-foreground">Assigned: {node.assignedToName ?? "Unassigned"}</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Duration: {formatDuration(node.durationSeconds)}</p>
                    <p>Transition: {formatDuration(node.transitionSeconds)}</p>
                  </div>
                  <div className="flex items-center gap-1 pt-1">
                    {node.status === "pending" && (
                      <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs" onClick={() => startNode(node.id)}>
                        <Play className="w-3 h-3" /> Start
                      </Button>
                    )}
                    {node.status === "in_progress" && (
                      <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs" onClick={() => completeNode(node.id)}>
                        <CheckCircle2 className="w-3 h-3" /> Complete
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-auto text-destructive" onClick={() => deleteNode(node.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {idx < nodes.length - 1 && (
                  <div className="flex items-center justify-center text-muted-foreground">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
