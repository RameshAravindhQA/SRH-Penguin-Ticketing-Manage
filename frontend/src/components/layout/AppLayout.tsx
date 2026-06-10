import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title = "Dashboard" }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  // Basic title mapping based on route
  let pageTitle = title;
  if (!title) {
    if (location.startsWith("/tickets/new")) pageTitle = "Raise Ticket";
    else if (location.startsWith("/monitor-board")) pageTitle = "Monitor Board";
    else if (location.startsWith("/tickets")) pageTitle = "My Tickets";
    else if (location.startsWith("/projects")) pageTitle = "Projects";
    else if (location.startsWith("/worklist")) pageTitle = "Common Worklist";
    else if (location.startsWith("/todos")) pageTitle = "To-Do Management";
    else if (location.startsWith("/reminders")) pageTitle = "Reminders";
    else if (location.startsWith("/calendar")) pageTitle = "Calendar";
    else if (location.startsWith("/timesheets")) pageTitle = "Timesheets";
    else if (location.startsWith("/users")) pageTitle = "Users";
    else if (location.startsWith("/settings")) pageTitle = "Settings";
    else if (location.startsWith("/notifications")) pageTitle = "Notifications";
    else if (location.startsWith("/audit-logs")) pageTitle = "Audit Logs";
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar collapsed={collapsed} className="hidden md:flex" />
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar className="relative z-10 w-[min(18rem,82vw)] shadow-2xl" onNavigate={() => setMobileOpen(false)} />
        </div>
      )}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          title={pageTitle}
          onMenuClick={() => {
            if (window.matchMedia("(max-width: 767px)").matches) setMobileOpen(true);
            else setCollapsed(!collapsed);
          }}
        />
        <main className="flex-1 min-h-0 overflow-hidden bg-slate-50">
          <div className="h-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
