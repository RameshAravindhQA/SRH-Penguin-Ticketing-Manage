import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/notifications", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { unreadOnly } = req.query as Record<string, string>;
  let notifs = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, authUser.userId))
    .orderBy(sql`${notificationsTable.createdAt} desc`)
    .limit(50);
  if (unreadOnly === "true") notifs = notifs.filter(n => !n.isRead);
  res.json(notifs.map(n => ({
    id: n.id, type: n.type, message: n.message,
    entityType: n.entityType ?? null, entityId: n.entityId ?? null, entityRef: n.entityRef ?? null,
    isRead: n.isRead, createdAt: n.createdAt.toISOString(),
  })));
});

router.patch("/notifications/:id/read", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const [notif] = await db.update(notificationsTable).set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, authUser.userId))).returning();
  if (!notif) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json({ id: notif.id, type: notif.type, message: notif.message, entityType: notif.entityType ?? null, entityId: notif.entityId ?? null, entityRef: notif.entityRef ?? null, isRead: notif.isRead, createdAt: notif.createdAt.toISOString() });
});

router.patch("/notifications/read-all", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, authUser.userId));
  res.json({ success: true });
});

export default router;
