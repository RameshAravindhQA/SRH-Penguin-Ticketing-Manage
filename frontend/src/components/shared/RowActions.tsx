import React from "react";
import { BellRing, Eye, FileClock, MessageSquare, Pencil, Send, UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function RowActions({
  onView,
  onEdit,
  onAudit,
  onReminder,
  onComment,
  onReassign,
  onForwardDepartment,
}: {
  onView: () => void;
  onEdit: () => void;
  onAudit: () => void;
  onReminder?: () => void;
  onComment?: () => void;
  onReassign?: () => void;
  onForwardDepartment?: () => void;
}) {
  const actions = [
    { label: "View", icon: Eye, onClick: onView },
    { label: "Edit", icon: Pencil, onClick: onEdit },
    ...(onComment ? [{ label: "Comment", icon: MessageSquare, onClick: onComment }] : []),
    ...(onReassign ? [{ label: "Reassign User", icon: UserRoundCog, onClick: onReassign }] : []),
    ...(onForwardDepartment ? [{ label: "Forward Department", icon: Send, onClick: onForwardDepartment }] : []),
    ...(onReminder ? [{ label: "Reminder", icon: BellRing, onClick: onReminder }] : []),
    { label: "Audit Logs", icon: FileClock, onClick: onAudit },
  ];

  return (
    <div className="flex items-center justify-end gap-1">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Tooltip key={action.label}>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={action.onClick}>
                <Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{action.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
