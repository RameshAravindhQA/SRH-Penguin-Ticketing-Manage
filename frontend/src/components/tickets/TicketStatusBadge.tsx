import React from "react";
import { Badge } from "@/components/ui/badge";

type StatusType = "open" | "yts" | "assigned" | "acknowledged" | "pending" | "in_progress" | "completed" | "closed" | "hold" | "forwarded" | "reopened" | "rejected";

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    yts: "YTS",
    in_progress: "In Progress",
  };
  return labels[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function TicketStatusBadge({ status }: { status: string }) {
  let colorClass = "bg-gray-100 text-gray-800 hover:bg-gray-100";
  const normalized = status.toLowerCase().replace(/\s+/g, "_").replace(/[()]/g, "");
  
  switch (normalized as StatusType) {
    case "open":
    case "yts":
      colorClass = "bg-blue-100 text-blue-700 hover:bg-blue-100";
      break;
    case "pending":
      colorClass = "bg-orange-100 text-orange-700 hover:bg-orange-100";
      break;
    case "in_progress":
    case "assigned":
    case "acknowledged":
      colorClass = "bg-indigo-100 text-indigo-700 hover:bg-indigo-100";
      break;
    case "completed":
      colorClass = "bg-green-100 text-green-700 hover:bg-green-100";
      break;
    case "closed":
      colorClass = "bg-gray-100 text-gray-700 hover:bg-gray-100";
      break;
    case "hold":
      colorClass = "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
      break;
    case "forwarded":
    case "reopened":
      colorClass = "bg-purple-100 text-purple-700 hover:bg-purple-100";
      break;
    case "rejected":
      colorClass = "bg-red-100 text-red-700 hover:bg-red-100";
      break;
  }

  return (
    <Badge className={`font-medium border-transparent ${colorClass}`}>
      {formatStatus(normalized)}
    </Badge>
  );
}

export function TicketPriorityBadge({ priority }: { priority: string }) {
  let colorClass = "text-gray-600";
  
  switch (priority.toLowerCase()) {
    case "critical":
      colorClass = "text-red-700 font-bold";
      break;
    case "high":
      colorClass = "text-red-600 font-semibold";
      break;
    case "medium":
      colorClass = "text-orange-500 font-semibold";
      break;
    case "low":
      colorClass = "text-green-600 font-medium";
      break;
  }

  return <span className={colorClass}>{priority.replace(/_/g, " ")}</span>;
}
