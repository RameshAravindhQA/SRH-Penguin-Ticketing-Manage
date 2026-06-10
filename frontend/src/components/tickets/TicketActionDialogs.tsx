import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ticket, useListUsers } from "@workspace/api-client-react";
import { MessageSquare, Send, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { UserSelect } from "@/components/shared/UserSelect";

type ActionType = "comment" | "reassign" | "forwardDepartment";

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
}

async function apiFetch(path: string, init?: RequestInit) {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return null;
  return response.json();
}

export function TicketActionDialog({
  ticket,
  action,
  onOpenChange,
  onSaved,
}: {
  ticket: Ticket | null;
  action: ActionType | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: users } = useListUsers();
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiFetch("/api/departments"),
    enabled: action === "forwardDepartment",
  });
  const [remarks, setRemarks] = React.useState("");
  const [hoursWorked, setHoursWorked] = React.useState("");
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (ticket && action) {
      setRemarks("");
      setHoursWorked("");
      setSelectedUserId("");
      setSelectedDepartmentId("");
    }
  }, [action, ticket]);

  const open = !!ticket && !!action;
  const title =
    action === "comment" ? "Add Comment" :
    action === "reassign" ? "Reassign User" :
    "Forward to Department";
  const Icon =
    action === "comment" ? MessageSquare :
    action === "reassign" ? UserRoundCog :
    Send;

  const save = async () => {
    if (!ticket || !action) return;
    if (action === "comment" && !remarks.trim()) {
      toast.error("Comment is required");
      return;
    }
    if (action === "reassign" && !selectedUserId) {
      toast.error("Select a user");
      return;
    }
    if (action === "forwardDepartment" && !selectedDepartmentId) {
      toast.error("Select a department");
      return;
    }

    setSaving(true);
    try {
      if (action === "comment") {
        await apiFetch(`/api/tickets/${ticket.id}/comments`, {
          method: "POST",
          body: JSON.stringify({ content: remarks.trim(), hoursWorked: hoursWorked ? Number(hoursWorked) : undefined }),
        });
        toast.success(hoursWorked ? "Comment added and timesheet updated" : "Comment added");
      } else if (action === "reassign") {
        await apiFetch(`/api/tickets/${ticket.id}/reassign`, {
          method: "PATCH",
          body: JSON.stringify({ assignedToId: Number(selectedUserId), remarks: remarks.trim() || undefined }),
        });
        toast.success("Ticket reassigned");
      } else {
        await apiFetch(`/api/tickets/${ticket.id}/forward-department`, {
          method: "PATCH",
          body: JSON.stringify({ departmentId: Number(selectedDepartmentId), remarks: remarks.trim() || undefined }),
        });
        toast.success("Ticket forwarded to department");
      }
      queryClient.invalidateQueries();
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Action failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" /> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <div className="font-medium">{ticket?.ticketNo}</div>
            <div className="text-muted-foreground">{ticket?.subject}</div>
          </div>
          {action === "reassign" && (
            <div className="space-y-1.5">
              <Label>User</Label>
              <UserSelect users={users} value={selectedUserId} onChange={setSelectedUserId} className="w-full" />
            </div>
          )}
          {action === "forwardDepartment" && (
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((department: any) => <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{action === "comment" ? "Comment" : "Remarks"}</Label>
            <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Add work note, reason, or instructions..." />
          </div>
          {action === "comment" && (
            <div className="space-y-1.5">
              <Label>Worked Hours</Label>
              <Input type="number" min="0" step="0.25" value={hoursWorked} onChange={(event) => setHoursWorked(event.target.value)} placeholder="e.g. 1.5" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
