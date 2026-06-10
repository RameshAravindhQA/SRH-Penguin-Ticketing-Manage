import { Router } from "express";
import { q } from "@workspace/db";
import { authMiddleware } from "../lib/auth";

const router = Router();

function fmtDate(v: any): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function formatSheet(t: any, userName?: string | null) {
  return {
    id: t.id, userId: t.userId, userName: userName ?? null,
    date: fmtDate(t.date),
    loginTime: t.loginTime ?? null, logoutTime: t.logoutTime ?? null,
    hoursWorked: t.hoursWorked,
    ticketId: t.ticketId ?? null, projectId: t.projectId ?? null,
    taskDescription: t.taskDescription ?? null,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
  };
}

router.get("/timesheets", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { userId, fromDate, toDate } = req.query as Record<string, string>;
  const targetId = userId ? parseInt(userId, 10) : authUser.userId;
  let sheets = await q`SELECT * FROM timesheets WHERE user_id = ${targetId} ORDER BY date DESC`;
  if (fromDate) sheets = sheets.filter((s: any) => fmtDate(s.date) >= fromDate);
  if (toDate) sheets = sheets.filter((s: any) => fmtDate(s.date) <= toDate);
  const [u] = await q<{ name: string }>`SELECT TOP 1 name FROM users WHERE id = ${targetId}`;
  res.json(sheets.map((s: any) => formatSheet(s, u?.name)));
});

router.post("/timesheets", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { date, loginTime, logoutTime, hoursWorked, ticketId, projectId, taskDescription } = req.body;
  if (!date || hoursWorked == null) { res.status(400).json({ error: "date and hoursWorked required" }); return; }
  const [sheet] = await q`
    INSERT INTO timesheets (user_id, date, login_time, logout_time, hours_worked, ticket_id, project_id, task_description, created_at)
    OUTPUT INSERTED.*
    VALUES (${authUser.userId}, ${date}, ${loginTime ?? null}, ${logoutTime ?? null}, ${hoursWorked},
            ${ticketId ?? null}, ${projectId ?? null}, ${taskDescription ?? null}, SYSDATETIMEOFFSET())`;
  res.status(201).json(formatSheet(sheet));
});

export default router;
