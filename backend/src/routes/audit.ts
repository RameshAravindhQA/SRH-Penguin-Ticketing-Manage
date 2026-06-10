import { Router } from "express";
import { q, qRaw, inList } from "@workspace/db";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/audit-logs", authMiddleware, async (req, res): Promise<void> => {
  const { entityType, entityId, userId } = req.query as Record<string, string>;
  let logs = await q`SELECT TOP 200 * FROM audit_logs ORDER BY created_at DESC`;
  if (entityType) logs = logs.filter((l: any) => l.entityType === entityType);
  if (entityId) logs = logs.filter((l: any) => l.entityId === parseInt(entityId, 10));
  if (userId) logs = logs.filter((l: any) => l.userId === parseInt(userId, 10));

  const userIds = [...new Set(logs.map((l: any) => l.userId as number))];
  const users = userIds.length
    ? await qRaw(`SELECT id, name FROM users WHERE id IN ${inList(userIds)}`)
    : [];
  const userMap = new Map((users as any[]).map(u => [u.id, u.name]));

  res.json(logs.map((l: any) => ({
    id: l.id, action: l.action, entityType: l.entityType, entityId: l.entityId ?? null,
    entityRef: l.entityRef ?? null, userId: l.userId,
    userName: userMap.get(l.userId) ?? null,
    oldValue: l.oldValue ?? null, newValue: l.newValue ?? null, ipAddress: l.ipAddress ?? null,
    createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
  })));
});

export default router;
