import { Router } from "express";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/audit-logs", authMiddleware, async (req, res): Promise<void> => {
  const { entityType, entityId, userId, fromDate, toDate } = req.query as Record<string, string>;
  let logs = await db.select().from(auditLogsTable).orderBy(sql`${auditLogsTable.createdAt} desc`).limit(200);

  if (entityType) logs = logs.filter(l => l.entityType === entityType);
  if (entityId) logs = logs.filter(l => l.entityId === parseInt(entityId, 10));
  if (userId) logs = logs.filter(l => l.userId === parseInt(userId, 10));

  const userIds = [...new Set(logs.map(l => l.userId))];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
    : [];
  const userMap = new Map(users.map(u => [u.id, u.name]));

  res.json(logs.map(l => ({
    id: l.id, action: l.action, entityType: l.entityType, entityId: l.entityId ?? null, entityRef: l.entityRef ?? null,
    userId: l.userId, userName: userMap.get(l.userId) ?? null,
    oldValue: l.oldValue ?? null, newValue: l.newValue ?? null, ipAddress: l.ipAddress ?? null,
    createdAt: l.createdAt.toISOString(),
  })));
});

export default router;
