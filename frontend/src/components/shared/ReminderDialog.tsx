import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ReminderTarget = {
  entityType: "ticket" | "project" | "todo";
  entityId: number;
  reference: string;
  title: string;
} | null;

async function reminderFetch(path: string, init?: RequestInit) {
  const token = localStorage.getItem("auth_token");
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export function ReminderDialog({
  target,
  onOpenChange,
}: {
  target: ReminderTarget;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [dateTime, setDateTime] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (target) {
      const nextHour = new Date(Date.now() + 60 * 60 * 1000);
      setDateTime(nextHour.toISOString().slice(0, 16));
      setNote("");
    }
  }, [target]);

  const save = async () => {
    if (!target || !dateTime) {
      toast.error("Reminder date and time is required");
      return;
    }
    setSaving(true);
    try {
      await reminderFetch("/api/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: `Reminder: ${target.reference}`,
          description: note || target.title,
          startDate: new Date(dateTime).toISOString(),
          type: "reminder",
          entityType: target.entityType,
          entityId: target.entityId,
        }),
      });
      toast.success("Reminder created");
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events", {}] });
      onOpenChange(false);
    } catch {
      toast.error("Failed to create reminder");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-4 w-4" /> Set Reminder
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <div className="font-medium">{target?.reference}</div>
            <div className="text-muted-foreground">{target?.title}</div>
          </div>
          <div className="space-y-1.5">
            <Label>Reminder Date & Time</Label>
            <Input type="datetime-local" value={dateTime} onChange={(event) => setDateTime(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Follow-up note or action..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Reminder"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
