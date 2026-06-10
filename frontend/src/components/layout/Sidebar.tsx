import React from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Monitor,
  ListTodo, 
  Ticket, 
  FolderKanban, 
  CalendarDays, 
  BellRing,
  Clock, 
  CalendarClock,
  Users, 
  Settings, 
  FileText, 
  BarChart3,
  Bell,
  UserCheck,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/monitor-board", label: "Monitor Board", icon: Monitor },
  { href: "/worklist", label: "Common Worklist", icon: ListTodo },
  { href: "/tickets/new", label: "Raise Ticket", icon: Ticket },
  { href: "/tickets/self-assigned", label: "Self Assign", icon: UserCheck },
  { href: "/tickets/routines", label: "Routine Tickets", icon: CalendarClock },
  { href: "/tickets", label: "My Tickets", icon: Ticket },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/todos", label: "To-Do", icon: ListTodo },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/timesheets", label: "Timesheets", icon: Clock },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/users", label: "Users", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/audit-logs", label: "Audit Logs", icon: FileText },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export function Sidebar({ collapsed = false, className, onNavigate }: { collapsed?: boolean; className?: string; onNavigate?: () => void }) {
  const [location] = useLocation();

  return (
    <div className={cn(
      "h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      <div className="h-16 flex items-center justify-center border-b border-sidebar-border">
        {collapsed ? (
          <img src="/srh-logo.png" alt="SRH" className="h-9 w-12 rounded bg-white object-contain p-1" />
        ) : (
          <div className="flex items-center gap-2 px-3">
            <img src="/srh-logo.png" alt="SRH" className="h-10 w-20 rounded bg-white object-contain p-1" />
            <span className="text-sm font-bold leading-tight text-white">Penguin Ticketing Management System</span>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div onClick={onNavigate} className={cn(
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
