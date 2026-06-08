import React from "react";
import { Ticket, useListCategories } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listSubCategories } from "@/lib/master-data";

export type TicketEditValues = {
  subject: string;
  description: string;
  priority: string;
  status: string;
  categoryId: string;
  subCategoryId: string;
  dueDate: string;
};

export function getTicketEditValues(ticket: Ticket | null): TicketEditValues {
  return {
    subject: ticket?.subject ?? "",
    description: ticket?.description ?? "",
    priority: ticket?.priority ?? "medium",
    status: ticket?.status ?? "open",
    categoryId: ticket?.categoryId ? String(ticket.categoryId) : "",
    subCategoryId: (ticket as any)?.subCategoryId ? String((ticket as any).subCategoryId) : "",
    dueDate: ticket?.dueDate ? ticket.dueDate.slice(0, 10) : "",
  };
}

export function TicketEditDialog({
  open,
  onOpenChange,
  ticket,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  ticket: Ticket | null;
  onSave: (values: TicketEditValues) => void;
  isSaving?: boolean;
}) {
  const { data: categories } = useListCategories();
  const { data: subCategories } = useQuery({ queryKey: ["sub-categories"], queryFn: listSubCategories });
  const [form, setForm] = React.useState<TicketEditValues>(() => getTicketEditValues(ticket));
  const filteredSubCategories = (subCategories || []).filter(sub => !form.categoryId || sub.categoryId === Number(form.categoryId));

  React.useEffect(() => {
    if (open) setForm(getTicketEditValues(ticket));
  }, [open, ticket]);

  const set = (key: keyof TicketEditValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const setSelect = (key: keyof TicketEditValues) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value === "none" ? "" : value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Ticket {ticket?.ticketNo ? `- ${ticket.ticketNo}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={form.subject} onChange={set("subject")} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={setSelect("status")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yts">YTS</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                  <SelectItem value="forwarded">Forwarded</SelectItem>
                  <SelectItem value="reassigned">Reassigned</SelectItem>
                  <SelectItem value="verify_in_process">Verify In Process</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="reopened">Reopened</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={setSelect("priority")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={set("dueDate")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.categoryId || "none"} onValueChange={setSelect("categoryId")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Category</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sub Category</Label>
            <Select value={form.subCategoryId || "none"} onValueChange={setSelect("subCategoryId")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Sub Category</SelectItem>
                {filteredSubCategories.map((sub) => (
                  <SelectItem key={sub.id} value={String(sub.id)}>{sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={set("description")} className="min-h-[110px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={isSaving || form.subject.trim().length < 5} onClick={() => onSave(form)}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
