import { Router } from "express";
import { q, qRaw } from "@workspace/db";
import { authMiddleware } from "../lib/auth";
import { getNotificationPreferences, upsertNotificationPreferences } from "../lib/notificationPreferences";

const router = Router();

function paramId(value: string | string[]): number {
  return parseInt(Array.isArray(value) ? value[0] : value, 10);
}

router.get("/notifications", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { unreadOnly } = req.query as Record<string, string>;
  let notifs = await q`SELECT TOP 50 * FROM notifications WHERE user_id = ${authUser.userId} ORDER BY created_at DESC`;
  if (unreadOnly === "true") notifs = notifs.filter((n: any) => !n.isRead);
  res.json(notifs.map((n: any) => ({
    id: n.id, type: n.type, message: n.message,
    entityType: n.entityType ?? null, entityId: n.entityId ?? null, entityRef: n.entityRef ?? null,
    isRead: !!n.isRead, createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
  })));
});

router.patch("/notifications/:id/read", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const authUser = (req as any).user;
  const [notif] = await q`UPDATE notifications SET is_read = 1 OUTPUT INSERTED.* WHERE id = ${id} AND user_id = ${authUser.userId}`;
  if (!notif) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json({ id: notif.id, type: notif.type, message: notif.message, entityType: notif.entityType ?? null, entityId: notif.entityId ?? null, entityRef: notif.entityRef ?? null, isRead: true, createdAt: notif.createdAt instanceof Date ? notif.createdAt.toISOString() : notif.createdAt });
});

router.patch("/notifications/read-all", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  await q`UPDATE notifications SET is_read = 1 WHERE user_id = ${authUser.userId}`;
  res.json({ success: true });
});

router.get("/notification-preferences", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  res.json(await getNotificationPreferences(authUser.userId));
});

router.patch("/notification-preferences", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { inAppEnabled, spaceEnabled, mailEnabled, calendarEnabled } = req.body ?? {};
  res.json(await upsertNotificationPreferences(authUser.userId, {
    ...(inAppEnabled !== undefined ? { inAppEnabled: !!inAppEnabled } : {}),
    ...(spaceEnabled !== undefined ? { spaceEnabled: !!spaceEnabled } : {}),
    ...(mailEnabled !== undefined ? { mailEnabled: !!mailEnabled } : {}),
    ...(calendarEnabled !== undefined ? { calendarEnabled: !!calendarEnabled } : {}),
  }));
});

export default router;
