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
  expectedCloseDate: string;
  sourceDepartment: string;
  serviceType: string;
  location: string;
  systemType: string;
  systemSubType: string;
  reviewSchedule: string;
  reviewDuration: string;
  isExternal: string;
  organizationName: string;
  providerName: string;
  externalPersonRole: string;
  externalPhoneNo: string;
  supportingPerson: string;
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
    expectedCloseDate: (ticket as any)?.expectedCloseDate ? String((ticket as any).expectedCloseDate).slice(0, 10) : "",
    sourceDepartment: (ticket as any)?.sourceDepartment ?? "",
    serviceType: (ticket as any)?.serviceType ?? "",
    location: (ticket as any)?.location ?? "",
    systemType: (ticket as any)?.systemType ?? "",
    systemSubType: (ticket as any)?.systemSubType ?? "",
    reviewSchedule: (ticket as any)?.reviewSchedule != null ? String((ticket as any).reviewSchedule) : "",
    reviewDuration: (ticket as any)?.reviewDuration ?? "",
    isExternal: (ticket as any)?.isExternal ? "true" : "false",
    organizationName: (ticket as any)?.organizationName ?? "",
    providerName: (ticket as any)?.providerName ?? "",
    externalPersonRole: (ticket as any)?.externalPersonRole ?? "",
    externalPhoneNo: (ticket as any)?.externalPhoneNo ?? "",
    supportingPerson: (ticket as any)?.supportingPerson ?? "",
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Expected Close</Label>
              <Input type="date" value={form.expectedCloseDate} onChange={set("expectedCloseDate")} />
            </div>
            <div className="space-y-1.5">
              <Label>From Department</Label>
              <Input value={form.sourceDepartment} onChange={set("sourceDepartment")} />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={set("location")} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Service Type</Label>
              <Input value={form.serviceType} onChange={set("serviceType")} />
            </div>
            <div className="space-y-1.5">
              <Label>System Type</Label>
              <Input value={form.systemType} onChange={set("systemType")} />
            </div>
            <div className="space-y-1.5">
              <Label>System Sub Type</Label>
              <Input value={form.systemSubType} onChange={set("systemSubType")} />
            </div>
            <div className="space-y-1.5">
              <Label>Review Schedule</Label>
              <Select value={form.reviewSchedule || "none"} onValueChange={setSelect("reviewSchedule")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="0">Daily</SelectItem>
                  <SelectItem value="1">Weekly</SelectItem>
                  <SelectItem value="2">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Review Duration</Label>
              <Input value={form.reviewDuration} onChange={set("reviewDuration")} />
            </div>
            <div className="space-y-1.5">
              <Label>External Support</Label>
              <Select value={form.isExternal} onValueChange={setSelect("isExternal")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Internal</SelectItem>
                  <SelectItem value="true">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Organization</Label>
              <Input value={form.organizationName} onChange={set("organizationName")} />
            </div>
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Input value={form.providerName} onChange={set("providerName")} />
            </div>
            <div className="space-y-1.5">
              <Label>Person Role</Label>
              <Input value={form.externalPersonRole} onChange={set("externalPersonRole")} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone No</Label>
              <Input value={form.externalPhoneNo} onChange={set("externalPhoneNo")} />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label>Supporting Person</Label>
              <Input value={form.supportingPerson} onChange={set("supportingPerson")} />
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
