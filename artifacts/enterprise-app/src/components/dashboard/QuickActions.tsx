import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { PlusCircle, FileText, UserPlus, CalendarPlus } from "lucide-react";

export function QuickActions() {
  const actions = [
    { label: "Raise Ticket", icon: PlusCircle, href: "/tickets/new" },
    { label: "Create Project", icon: FileText, href: "/projects/new" },
    { label: "Assign Task", icon: UserPlus, href: "/todos" },
    { label: "Schedule Meeting", icon: CalendarPlus, href: "/calendar" },
  ];

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col gap-2">
        {actions.map((action, i) => (
          <Link key={i} href={action.href} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md transition-colors text-sm text-foreground">
            <action.icon className="w-4 h-4 text-primary" />
            {action.label}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
