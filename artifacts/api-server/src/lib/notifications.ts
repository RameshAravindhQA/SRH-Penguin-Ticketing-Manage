import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { logger } from "./logger";

interface NotifyOptions {
  userId: number;
  type: string;
  message: string;
  entityType?: string;
  entityId?: number;
  entityRef?: string;
}

export async function createNotification(opts: NotifyOptions): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      userId: opts.userId,
      type: opts.type,
      message: opts.message,
      entityType: opts.entityType ?? null,
      entityId: opts.entityId ?? null,
      entityRef: opts.entityRef ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to create notification");
  }
}
