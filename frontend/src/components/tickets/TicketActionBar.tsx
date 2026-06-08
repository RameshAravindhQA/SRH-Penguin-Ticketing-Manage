import React from "react";
import { CheckCircle2, Edit, PauseCircle, PlayCircle, RefreshCw, Trash2, XCircle, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type TicketActionBarProps = {
  status: string;
  onStatusChange: (status: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
};

const statusActions = [
  { status: "in_progress", label: "Start Progress", icon: PlayCircle },
  { status: "pending", label: "Mark Pending", icon: Clock3 },
  { status: "hold", label: "Put On Hold", icon: PauseCircle },
  { status: "completed", label: "Complete", icon: CheckCircle2 },
  { status: "closed", label: "Close", icon: XCircle },
  { status: "reopened", label: "Reopen", icon: RefreshCw },
];

export function TicketActionBar({ status, onStatusChange, onEdit, onDelete, disabled }: TicketActionBarProps) {
  const normalizedStatus = status.toLowerCase();

  return (
    <div className="flex items-center justify-end gap-1">
      {statusActions.map((action) => {
        const Icon = action.icon;
        const isActive = normalizedStatus === action.status;
        return (
          <Tooltip key={action.status}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={isActive ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                disabled={disabled || isActive}
                onClick={() => onStatusChange(action.status)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{action.label}</TooltipContent>
          </Tooltip>
        );
      })}
      {onEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit Ticket</TooltipContent>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete Ticket</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
