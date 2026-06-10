import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useListUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Activity, Flag, CheckSquare, Download } from "lucide-react";
import { format } from "date-fns";
import {
  projectFetch, formatDuration,
  type ProjectActivity, type ProjectFlag, type ProjectApproval, type UserActivitySummary,
} from "@/lib/projectApi";
import { exportUserPDF } from "@/lib/projectExport";

export function ActivityHistory({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { data: users } = useListUsers();

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["project-activity", projectId],
    queryFn: () => projectFetch<ProjectActivity[]>(`/api/projects/${projectId}/activity`),
  });
  const { data: flags } = useQuery({
    queryKey: ["project-flags", projectId],
    queryFn: () => projectFetch<ProjectFlag[]>(`/api/projects/${projectId}/flags`),
  });
  const { data: approvals } = useQuery({
    queryKey: ["project-approvals", projectId],
    queryFn: () => projectFetch<ProjectApproval[]>(`/api/projects/${projectId}/approvals`),
  });

  const [flagText, setFlagText] = React.useState("");
  const [selectedUserId, setSelectedUserId] = React.useState<string>("");

  const { data: userActivity, isLoading: userActivityLoading } = useQuery({
    queryKey: ["project-user-activity", projectId, selectedUserId],
    queryFn: () => projectFetch<UserActivitySummary>(`/api/projects/${projectId}/users/${selectedUserId}/activity`),
    enabled: !!selectedUserId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["project-activity", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-flags", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-approvals", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-user-activity", projectId, selectedUserId] });
  };

  const raiseFlag = async () => {
    if (!flagText.trim()) {
      toast.error("Flag description is required");
      return;
    }
    try {
      await projectFetch(`/api/projects/${projectId}/flags`, {
        method: "POST",
        body: JSON.stringify({ description: flagText.trim() }),
      });
      setFlagText("");
      refresh();
      toast.success("Flag raised");
    } catch {
      toast.error("Failed to raise flag");
    }
  };

  const resolveFlag = async (flagId: number) => {
    try {
      await projectFetch(`/api/projects/${projectId}/flags/${flagId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
      });
      refresh();
      toast.success("Flag resolved");
    } catch {
      toast.error("Failed to resolve flag");
    }
  };

  const approve = async (status: "approved" | "rejected") => {
    try {
      await projectFetch(`/api/projects/${projectId}/approvals`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      refresh();
      toast.success(status === "approved" ? "Approved" : "Rejected");
    } catch {
      toast.error("Failed to record approval");
    }
  };

  const exportSelectedUserPDF = async () => {
    if (!selectedUserId) {
      toast.error("Select a user first");
      return;
    }
    try {
      const data = await projectFetch<any>(`/api/projects/${projectId}/users/${selectedUserId}/export-data`);
      await exportUserPDF(data);
      toast.success("User PDF exported");
    } catch {
      toast.error("Failed to export user PDF");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="py-4 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" /> Project Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          {activitiesLoading ? (
            <div className="text-sm text-muted-foreground">Loading activity...</div>
          ) : !activities?.length ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-b-0">
                  <Badge variant="outline" className="capitalize shrink-0">{a.action}</Badge>
                  <div className="flex-1">
                    <p>
                      <span className="font-medium">{a.userName ?? "Unknown"}</span>
                      {a.nodeName ? <> on <span className="font-medium">{a.nodeName}</span></> : null}
                      {a.action === "start" && a.fromNodeName ? <> (from {a.fromNodeName})</> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(a.occurredAt), "dd MMM yyyy, h:mm a")}
                      {a.durationSeconds != null ? ` · Duration: ${formatDuration(a.durationSeconds)}` : ""}
                      {a.transitionSeconds != null ? ` · Transition: ${formatDuration(a.transitionSeconds)}` : ""}
                    </p>
                    {a.remarks && <p className="text-xs mt-1">{a.remarks}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="py-4 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Flag className="w-4 h-4" /> Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 space-y-3">
            <div className="flex gap-2">
              <Textarea
                value={flagText}
                onChange={(e) => setFlagText(e.target.value)}
                placeholder="Describe an issue or blocker..."
                className="min-h-[60px] bg-white"
              />
            </div>
            <Button size="sm" onClick={raiseFlag}>Raise Flag</Button>
            {!flags?.length ? (
              <p className="text-sm text-muted-foreground">No flags raised.</p>
            ) : (
              <div className="space-y-2">
                {flags.map((f) => (
                  <div key={f.id} className="rounded-md border p-2 text-sm flex items-start justify-between gap-2">
                    <div>
                      <p>{f.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.raisedByName} · {format(new Date(f.createdAt), "dd MMM yyyy")}
                      </p>
                    </div>
                    {f.status === "open" ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => resolveFlag(f.id)}>Resolve</Button>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 shrink-0">resolved</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="w-4 h-4" /> Approvals
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => approve("approved")}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => approve("rejected")}>Reject</Button>
            </div>
            {!approvals?.length ? (
              <p className="text-sm text-muted-foreground">No approvals recorded.</p>
            ) : (
              <div className="space-y-2">
                {approvals.map((a) => (
                  <div key={a.id} className="rounded-md border p-2 text-sm">
                    <p>
                      <Badge className={a.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{a.status}</Badge>
                      <span className="ml-2">{a.approvedByName}</span>
                    </p>
                    {a.remarks && <p className="text-xs mt-1">{a.remarks}</p>}
                    <p className="text-xs text-muted-foreground">{format(new Date(a.createdAt), "dd MMM yyyy, h:mm a")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-4 border-b">
          <CardTitle className="text-base flex items-center justify-between">
            <span>User-wise Activity History</span>
            <div className="flex items-center gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={exportSelectedUserPDF} disabled={!selectedUserId}>
                <Download className="w-3 h-3" /> Export User PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          {!selectedUserId ? (
            <p className="text-sm text-muted-foreground">Select a user to view their activity history.</p>
          ) : userActivityLoading ? (
            <div className="text-sm text-muted-foreground">Loading user activity...</div>
          ) : !userActivity ? (
            <p className="text-sm text-muted-foreground">No data available.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <SummaryStat label="Tasks Worked" value={userActivity.summary.tasksWorked} />
                <SummaryStat label="Comments" value={userActivity.summary.commentsAdded} />
                <SummaryStat label="Flags Raised" value={userActivity.summary.flagsRaised} />
                <SummaryStat label="Approvals" value={userActivity.summary.approvalsPerformed} />
                <SummaryStat label="Days Worked" value={userActivity.summary.daysWorked} />
                <SummaryStat label="Total Hours" value={`${userActivity.summary.totalHoursWorked}h`} />
              </div>
              {!userActivity.activities.length ? (
                <p className="text-sm text-muted-foreground">No activity recorded for this user.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                  {userActivity.activities.map((a) => (
                    <div key={a.id} className="text-sm border-b pb-2 last:border-b-0">
                      <p>
                        <Badge variant="outline" className="capitalize mr-2">{a.action}</Badge>
                        {a.nodeName ?? "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.occurredAt), "dd MMM yyyy, h:mm a")}
                        {a.durationSeconds != null ? ` · Duration: ${formatDuration(a.durationSeconds)}` : ""}
                        {a.transitionSeconds != null ? ` · Transition: ${formatDuration(a.transitionSeconds)}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
