import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { logger } from "./logger";

interface AuditOptions {
  action: string;
  entityType: string;
  entityId?: number;
  entityRef?: string;
  userId: number;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}

export async function createAuditLog(opts: AuditOptions): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId ?? null,
      entityRef: opts.entityRef ?? null,
      userId: opts.userId,
      oldValue: opts.oldValue != null ? JSON.stringify(opts.oldValue) : null,
      newValue: opts.newValue != null ? JSON.stringify(opts.newValue) : null,
      ipAddress: opts.ipAddress ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to create audit log");
  }
}
