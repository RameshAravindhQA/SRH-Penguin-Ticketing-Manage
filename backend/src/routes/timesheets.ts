import { Router } from "express";
import { db, timesheetsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

function formatTimesheet(t: any, userName?: string | null) {
  return {
    id: t.id, userId: t.userId, userName: userName ?? null,
    date: t.date,
    loginTime: t.loginTime ?? null, logoutTime: t.logoutTime ?? null,
    hoursWorked: t.hoursWorked,
    ticketId: t.ticketId ?? null, projectId: t.projectId ?? null,
    taskDescription: t.taskDescription ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/timesheets", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { userId, fromDate, toDate } = req.query as Record<string, string>;
  const targetUserId = userId ? parseInt(userId, 10) : authUser.userId;
  let sheets = await db.select().from(timesheetsTable)
    .where(eq(timesheetsTable.userId, targetUserId))
    .orderBy(sql`${timesheetsTable.date} desc`);
  if (fromDate) sheets = sheets.filter(s => s.date >= fromDate);
  if (toDate) sheets = sheets.filter(s => s.date <= toDate);
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, targetUserId)).limit(1);
  res.json(sheets.map(s => formatTimesheet(s, u?.name)));
});

router.post("/timesheets", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { date, loginTime, logoutTime, hoursWorked, ticketId, projectId, taskDescription } = req.body;
  if (!date || hoursWorked == null) { res.status(400).json({ error: "date and hoursWorked required" }); return; }
  const [sheet] = await db.insert(timesheetsTable).values({
    userId: authUser.userId, date, loginTime: loginTime ?? null, logoutTime: logoutTime ?? null,
    hoursWorked, ticketId: ticketId ?? null, projectId: projectId ?? null,
    taskDescription: taskDescription ?? null,
  }).returning();
  res.status(201).json(formatTimesheet(sheet));
});

export default router;
