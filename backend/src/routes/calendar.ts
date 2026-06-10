import { Router } from "express";
import { q, qRaw } from "@workspace/db";
import { authMiddleware } from "../lib/auth";
import { checkGoogleAvailability, deleteGoogleCalendarEvent, pullGoogleEventIntoLocal, pullKnownGoogleEventsIntoLocal, syncCalendarEventToGoogle } from "../lib/googleIntegration";
import { getNotificationPreferences } from "../lib/notificationPreferences";

const router = Router();

function paramId(value: string | string[]): number {
  return parseInt(Array.isArray(value) ? value[0] : value, 10);
}

function formatEvent(e: any) {
  return {
    id: e.id, title: e.title, description: e.description ?? null,
    startDate: e.startDate instanceof Date ? e.startDate.toISOString() : e.startDate,
    endDate: e.endDate instanceof Date ? e.endDate.toISOString() : e.endDate ?? null,
    type: e.type,
    entityType: e.entityType ?? null, entityId: e.entityId ?? null,
    meetingLink: e.googleMeetLink ?? e.meetingLink ?? null,
    googleEventId: e.googleEventId ?? null,
    googleMeetLink: e.googleMeetLink ?? null,
    googleHtmlLink: e.googleHtmlLink ?? null,
    googleSyncStatus: e.googleSyncStatus ?? null,
    googleSyncError: e.googleSyncError ?? null,
    googleSyncedAt: e.googleSyncedAt instanceof Date ? e.googleSyncedAt.toISOString() : e.googleSyncedAt ?? null,
    attendeeIds: e.attendeeIds ? String(e.attendeeIds).split(",").filter(Boolean).map(Number) : [],
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
  };
}

async function syncToGoogleIfEnabled(userId: number, input: Parameters<typeof syncCalendarEventToGoogle>[0]) {
  const preferences = await getNotificationPreferences(userId);
  if (!preferences.calendarEnabled) return;
  await syncCalendarEventToGoogle(input);
}

router.get("/calendar/events", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const events = await q`SELECT * FROM calendar_events WHERE user_id = ${authUser.userId} ORDER BY start_date ASC`;
  res.json(events.map(formatEvent));
});

router.post("/calendar/availability", authMiddleware, async (req, res): Promise<void> => {
  const { startDate, endDate, attendeeIds } = req.body ?? {};
  if (!startDate) { res.status(400).json({ error: "startDate required" }); return; }
  const result = await checkGoogleAvailability({
    startDate,
    endDate,
    attendeeIds: Array.isArray(attendeeIds) ? attendeeIds.map(Number) : [],
  });
  if (!result) { res.status(502).json({ error: "Google availability check failed" }); return; }
  res.json({
    ...result,
    hasConflicts: result.attendees.some(attendee => attendee.busy.length > 0),
  });
});

router.post("/calendar/google/webhook", async (req, res): Promise<void> => {
  const expectedToken = process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN;
  const providedToken = req.header("x-goog-channel-token");
  if (expectedToken && providedToken !== expectedToken) {
    res.status(401).json({ error: "Invalid Google channel token" });
    return;
  }
  const resourceId = req.header("x-goog-resource-id") ?? null;
  const googleEventId = req.header("x-srh-google-event-id") || req.query.googleEventId;
  if (typeof googleEventId === "string" && googleEventId) {
    await pullGoogleEventIntoLocal(googleEventId);
  } else {
    await pullKnownGoogleEventsIntoLocal();
  }
  res.json({ ok: true, resourceId });
});

router.post("/calendar/google/sync", authMiddleware, async (_req, res): Promise<void> => {
  res.json(await pullKnownGoogleEventsIntoLocal());
});

router.post("/calendar/events", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { title, description, startDate, endDate, type, meetingLink, entityType, entityId, attendeeIds } = req.body;
  if (!title || !startDate || !type) { res.status(400).json({ error: "Title, startDate and type required" }); return; }
  const [event] = await q`
    INSERT INTO calendar_events (user_id, title, description, start_date, end_date, type, entity_type, entity_id, meeting_link, attendee_ids, created_at)
    OUTPUT INSERTED.*
    VALUES (${authUser.userId}, ${title}, ${description ?? null}, ${new Date(startDate)}, ${endDate ? new Date(endDate) : null},
            ${type}, ${entityType ?? null}, ${entityId ?? null}, ${meetingLink ?? null},
            ${Array.isArray(attendeeIds) ? attendeeIds.join(",") : attendeeIds ?? null}, SYSDATETIMEOFFSET())`;
  await syncToGoogleIfEnabled(authUser.userId, {
    localEventId: (event as any).id,
    title,
    description,
    startDate,
    endDate,
    type,
    entityType,
    entityId,
    attendeeIds: Array.isArray(attendeeIds) ? attendeeIds.map(Number) : [],
    createMeet: true,
  });
  const [syncedEvent] = await q`SELECT TOP 1 * FROM calendar_events WHERE id = ${(event as any).id}`;
  res.status(201).json(formatEvent(syncedEvent ?? event));
});

router.patch("/calendar/events/:id", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const id = paramId(req.params.id);
  const { title, description, startDate, endDate, type, meetingLink, entityType, entityId, attendeeIds } = req.body;
  const sets: string[] = [];
  const params: Record<string, any> = { id, uid: authUser.userId };
  if (title) { sets.push("title = @title"); params.title = title; }
  if (description !== undefined) { sets.push("description = @desc"); params.desc = description || null; }
  if (startDate) { sets.push("start_date = @sd"); params.sd = new Date(startDate); }
  if (endDate !== undefined) { sets.push("end_date = @ed"); params.ed = endDate ? new Date(endDate) : null; }
  if (type) { sets.push("type = @type"); params.type = type; }
  if (meetingLink !== undefined) { sets.push("meeting_link = @ml"); params.ml = meetingLink || null; }
  if (attendeeIds !== undefined) { sets.push("attendee_ids = @aids"); params.aids = Array.isArray(attendeeIds) ? attendeeIds.join(",") : attendeeIds || null; }
  if (entityType !== undefined) { sets.push("entity_type = @et"); params.et = entityType || null; }
  if (entityId !== undefined) { sets.push("entity_id = @eid"); params.eid = entityId ? Number(entityId) : null; }
  if (!sets.length) { res.status(400).json({ error: "No fields" }); return; }
  const [event] = await qRaw(`UPDATE calendar_events SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id AND user_id = @uid`, params);
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  await syncToGoogleIfEnabled(authUser.userId, {
    localEventId: (event as any).id,
    title: (event as any).title,
    description: (event as any).description ?? null,
    startDate: (event as any).startDate,
    endDate: (event as any).endDate ?? null,
    type: (event as any).type,
    entityType: (event as any).entityType ?? null,
    entityId: (event as any).entityId ?? null,
    attendeeIds: (event as any).attendeeIds ? String((event as any).attendeeIds).split(",").filter(Boolean).map(Number) : [],
    createMeet: true,
  });
  const [syncedEvent] = await q`SELECT TOP 1 * FROM calendar_events WHERE id = ${(event as any).id}`;
  res.json(formatEvent(syncedEvent ?? event));
});

router.delete("/calendar/events/:id", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const id = paramId(req.params.id);
  const [event] = await q<{ googleEventId: string | null }>`SELECT TOP 1 google_event_id AS googleEventId FROM calendar_events WHERE id = ${id} AND user_id = ${authUser.userId}`;
  await q`DELETE FROM calendar_events WHERE id = ${id} AND user_id = ${authUser.userId}`;
  await deleteGoogleCalendarEvent(event?.googleEventId);
  res.sendStatus(204);
});

export default router;
