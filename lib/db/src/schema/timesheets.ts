import { pgTable, text, serial, integer, timestamp, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const timesheetsTable = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  loginTime: text("login_time"),
  logoutTime: text("logout_time"),
  hoursWorked: real("hours_worked").notNull().default(0),
  ticketId: integer("ticket_id"),
  projectId: integer("project_id"),
  taskDescription: text("task_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimesheetSchema = createInsertSchema(timesheetsTable).omit({ id: true, createdAt: true });
export type Timesheet = typeof timesheetsTable.$inferSelect;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
