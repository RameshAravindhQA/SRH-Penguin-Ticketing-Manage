import { Router } from "express";
import { db, calendarEventsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

function formatEvent(e: any) {
  return {
    id: e.id, title: e.title, description: e.description ?? null,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate?.toISOString() ?? null,
    type: e.type,
    entityType: e.entityType ?? null, entityId: e.entityId ?? null,
    meetingLink: e.meetingLink ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/calendar/events", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const events = await db.select().from(calendarEventsTable)
    .where(eq(calendarEventsTable.userId, authUser.userId))
    .orderBy(sql`${calendarEventsTable.startDate} asc`);
  res.json(events.map(formatEvent));
});

router.post("/calendar/events", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { title, description, startDate, endDate, type, meetingLink } = req.body;
  if (!title || !startDate || !type) { res.status(400).json({ error: "Title, startDate and type required" }); return; }
  const [event] = await db.insert(calendarEventsTable).values({
    userId: authUser.userId,
    title,
    description: description ?? null,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : null,
    type,
    meetingLink: meetingLink ?? null,
  }).returning();
  res.status(201).json(formatEvent(event));
});

router.delete("/calendar/events/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(calendarEventsTable).where(eq(calendarEventsTable.id, id));
  res.sendStatus(204);
});

export default router;
