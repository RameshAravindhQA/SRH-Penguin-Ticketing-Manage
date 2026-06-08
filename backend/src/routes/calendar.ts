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
    attendeeIds: e.attendeeIds ? e.attendeeIds.split(",").filter(Boolean).map((id: string) => Number(id)) : [],
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
  const { title, description, startDate, endDate, type, meetingLink, entityType, entityId, attendeeIds } = req.body;
  if (!title || !startDate || !type) { res.status(400).json({ error: "Title, startDate and type required" }); return; }
  const [event] = await db.insert(calendarEventsTable).values({
    userId: authUser.userId,
    title,
    description: description ?? null,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : null,
    type,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    meetingLink: meetingLink ?? null,
    attendeeIds: Array.isArray(attendeeIds) ? attendeeIds.join(",") : attendeeIds ?? null,
  }).returning();
  res.status(201).json(formatEvent(event));
});

router.patch("/calendar/events/:id", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { title, description, startDate, endDate, type, meetingLink, entityType, entityId, attendeeIds } = req.body;
  const [event] = await db.update(calendarEventsTable).set({
    ...(title ? { title } : {}),
    ...(description !== undefined ? { description: description || null } : {}),
    ...(startDate ? { startDate: new Date(startDate) } : {}),
    ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
    ...(type ? { type } : {}),
    ...(meetingLink !== undefined ? { meetingLink: meetingLink || null } : {}),
    ...(attendeeIds !== undefined ? { attendeeIds: Array.isArray(attendeeIds) ? attendeeIds.join(",") : attendeeIds || null } : {}),
    ...(entityType !== undefined ? { entityType: entityType || null } : {}),
    ...(entityId !== undefined ? { entityId: entityId ? Number(entityId) : null } : {}),
  }).where(and(eq(calendarEventsTable.id, id), eq(calendarEventsTable.userId, authUser.userId))).returning();
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  res.json(formatEvent(event));
});

router.delete("/calendar/events/:id", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(calendarEventsTable).where(and(eq(calendarEventsTable.id, id), eq(calendarEventsTable.userId, authUser.userId)));
  res.sendStatus(204);
});

export default router;
