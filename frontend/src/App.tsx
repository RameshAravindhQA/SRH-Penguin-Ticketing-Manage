import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ConfirmationProvider } from "@/components/shared/ConfirmationProvider";
import { loadSavedTheme } from "@/lib/theme";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import WorklistPage from "@/pages/worklist";
import TicketsPage from "@/pages/tickets";
import RaiseTicketPage from "@/pages/tickets-new";
import SelfAssignTicketsPage from "@/pages/self-assign-tickets";
import TicketRoutinesPage from "@/pages/ticket-routines";
import TicketDetailPage from "@/pages/ticket-detail";
import ProjectsPage from "@/pages/projects";
import CreateProjectPage from "@/pages/projects-new";
import ProjectDetailPage from "@/pages/project-detail";
import TodosPage from "@/pages/todos";
import CalendarPage from "@/pages/calendar";
import RemindersPage from "@/pages/reminders";
import MonitorBoardPage from "@/pages/monitor-board";
import ReportsPage from "@/pages/reports";
import TimesheetsPage from "@/pages/timesheets";
import UsersPage from "@/pages/users";
import SettingsPage from "@/pages/settings";
import AuditLogsPage from "@/pages/audit-logs";
import NotificationsPage from "@/pages/notifications";
import DocumentsPage from "@/pages/documents";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 20_000 },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { token, authChecked } = useAuth();
  if (!authChecked) {
    return null;
  }
  if (!token) {
    window.location.href = import.meta.env.BASE_URL.replace(/\/$/, "") + "/login";
    return null;
  }
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/monitor-board" component={() => <ProtectedRoute component={MonitorBoardPage} />} />
      <Route path="/monitor" component={() => <ProtectedRoute component={MonitorBoardPage} />} />
      <Route path="/monitorboard" component={() => <ProtectedRoute component={MonitorBoardPage} />} />
      <Route path="/worklist" component={() => <ProtectedRoute component={WorklistPage} />} />
      <Route path="/tickets/new" component={() => <ProtectedRoute component={RaiseTicketPage} />} />
      <Route path="/tickets/self-assigned" component={() => <ProtectedRoute component={SelfAssignTicketsPage} />} />
      <Route path="/tickets/routines" component={() => <ProtectedRoute component={TicketRoutinesPage} />} />
      <Route path="/tickets/:id" component={() => <ProtectedRoute component={TicketDetailPage} />} />
      <Route path="/tickets" component={() => <ProtectedRoute component={TicketsPage} />} />
      <Route path="/projects/new" component={() => <ProtectedRoute component={CreateProjectPage} />} />
      <Route path="/projects/:id" component={() => <ProtectedRoute component={ProjectDetailPage} />} />
      <Route path="/projects" component={() => <ProtectedRoute component={ProjectsPage} />} />
      <Route path="/todos" component={() => <ProtectedRoute component={TodosPage} />} />
      <Route path="/reminders" component={() => <ProtectedRoute component={RemindersPage} />} />
      <Route path="/calendar" component={() => <ProtectedRoute component={CalendarPage} />} />
      <Route path="/timesheets" component={() => <ProtectedRoute component={TimesheetsPage} />} />
      <Route path="/documents" component={() => <ProtectedRoute component={DocumentsPage} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={ReportsPage} />} />
      <Route path="/users" component={() => <ProtectedRoute component={UsersPage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route path="/audit-logs" component={() => <ProtectedRoute component={AuditLogsPage} />} />
      <Route path="/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => { loadSavedTheme(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <ConfirmationProvider>
              <Router />
            </ConfirmationProvider>
          </AuthProvider>
        </WouterRouter>
        <Toaster position="top-right" richColors closeButton />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
