import { q } from "@workspace/db";
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
    await q`INSERT INTO audit_logs (action, entity_type, entity_id, entity_ref, user_id, old_value, new_value, ip_address, created_at)
             VALUES (${opts.action}, ${opts.entityType}, ${opts.entityId ?? null}, ${opts.entityRef ?? null},
                     ${opts.userId}, ${opts.oldValue != null ? JSON.stringify(opts.oldValue) : null},
                     ${opts.newValue != null ? JSON.stringify(opts.newValue) : null},
                     ${opts.ipAddress ?? null}, SYSDATETIMEOFFSET())`;
  } catch (err) {
    logger.error({ err }, "Failed to create audit log");
  }
}
