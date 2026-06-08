import React from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ListTodo, 
  Ticket, 
  FolderKanban, 
  CalendarDays, 
  Clock, 
  Users, 
  Settings, 
  FileText, 
  Bell,
  UserCheck,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/worklist", label: "Common Worklist", icon: ListTodo },
  { href: "/tickets/new", label: "Raise Ticket", icon: Ticket },
  { href: "/tickets/self-assigned", label: "Self Assign", icon: UserCheck },
  { href: "/tickets", label: "My Tickets", icon: Ticket },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/todos", label: "To-Do", icon: ListTodo },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/timesheets", label: "Timesheets", icon: Clock },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/users", label: "Users", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/audit-logs", label: "Audit Logs", icon: FileText },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const [location] = useLocation();

  return (
    <div className={cn(
      "h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="h-16 flex items-center justify-center border-b border-sidebar-border">
        {collapsed ? (
          <div className="font-bold text-xl text-white">SRH</div>
        ) : (
          <div className="px-3 text-center text-base font-bold tracking-tight text-white">SRH Penguin Ticketing Management System</div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-white/85 hover:bg-sidebar-accent hover:text-white"
                  )}>
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
