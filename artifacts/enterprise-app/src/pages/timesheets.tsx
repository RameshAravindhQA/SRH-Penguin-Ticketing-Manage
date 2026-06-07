import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListTimesheets } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TimesheetsPage() {
  const { data: timesheets, isLoading } = useListTimesheets({});

  return (
    <AppLayout title="Timesheets">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Time Tracking</h2>
            <p className="text-muted-foreground text-sm">Log your daily hours against tickets and projects.</p>
          </div>
          <Button className="gap-2">
            <Clock className="w-4 h-4" />
            Log Time
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading timesheets...</div>
            ) : !timesheets || timesheets.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No time entries found.</div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timesheets.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{format(new Date(entry.date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{entry.userName}</TableCell>
                      <TableCell className="font-mono text-primary font-semibold">{entry.hoursWorked}h</TableCell>
                      <TableCell className="max-w-[300px] truncate">{entry.taskDescription}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {entry.ticketId ? `Ticket #${entry.ticketId}` : entry.projectId ? `Project #${entry.projectId}` : "General"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
