import React from "react";
import { Badge } from "@/components/ui/badge";

type StatusType = "Open" | "Open (YTS)" | "Pending" | "In Progress" | "Completed" | "Closed" | "Hold" | "Forwarded" | "Rejected";

export function TicketStatusBadge({ status }: { status: string }) {
  let colorClass = "bg-gray-100 text-gray-800 hover:bg-gray-100";
  
  switch (status as StatusType) {
    case "Open":
    case "Open (YTS)":
      colorClass = "bg-blue-100 text-blue-700 hover:bg-blue-100";
      break;
    case "Pending":
      colorClass = "bg-orange-100 text-orange-700 hover:bg-orange-100";
      break;
    case "In Progress":
      colorClass = "bg-indigo-100 text-indigo-700 hover:bg-indigo-100";
      break;
    case "Completed":
      colorClass = "bg-green-100 text-green-700 hover:bg-green-100";
      break;
    case "Closed":
      colorClass = "bg-gray-100 text-gray-700 hover:bg-gray-100";
      break;
    case "Hold":
      colorClass = "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
      break;
    case "Forwarded":
      colorClass = "bg-purple-100 text-purple-700 hover:bg-purple-100";
      break;
    case "Rejected":
      colorClass = "bg-red-100 text-red-700 hover:bg-red-100";
      break;
  }

  return (
    <Badge className={`font-medium border-transparent ${colorClass}`}>
      {status}
    </Badge>
  );
}

export function TicketPriorityBadge({ priority }: { priority: string }) {
  let colorClass = "text-gray-600";
  
  switch (priority) {
    case "High":
      colorClass = "text-red-600 font-semibold";
      break;
    case "Medium":
      colorClass = "text-orange-500 font-semibold";
      break;
    case "Low":
      colorClass = "text-green-600 font-medium";
      break;
  }

  return <span className={colorClass}>{priority}</span>;
}
