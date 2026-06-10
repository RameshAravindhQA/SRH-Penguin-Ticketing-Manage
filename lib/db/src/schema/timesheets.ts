export type Timesheet = {
  id: number;
  userId: number;
  date: string;
  loginTime: string | null;
  logoutTime: string | null;
  hoursWorked: number;
  ticketId: number | null;
  projectId: number | null;
  taskDescription: string | null;
  createdAt: Date;
};

export type InsertTimesheet = Omit<Timesheet, "id" | "createdAt">;
