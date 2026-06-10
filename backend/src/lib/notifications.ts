import { q } from "@workspace/db";
import { logger } from "./logger";
import { sendGoogleChatSpaceMessage } from "./googleChat";
import { getNotificationPreferences } from "./notificationPreferences";
import { sendGmailNotification } from "./googleMail";

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
    const preferences = await getNotificationPreferences(opts.userId);
    if (preferences.inAppEnabled) {
      await q`INSERT INTO notifications (user_id, type, message, entity_type, entity_id, entity_ref, is_read, created_at)
               VALUES (${opts.userId}, ${opts.type}, ${opts.message}, ${opts.entityType ?? null},
                       ${opts.entityId ?? null}, ${opts.entityRef ?? null}, 0, SYSDATETIMEOFFSET())`;
    }
    if (preferences.spaceEnabled) {
      await sendGoogleChatSpaceMessage(opts);
    }
    if (preferences.mailEnabled) {
      await sendGmailNotification({
        userId: opts.userId,
        subject: notificationSubject(opts.type, opts.entityRef),
        text: opts.message,
        entityRef: opts.entityRef,
      });
    }
  } catch (err) {
    logger.error({ err }, "Failed to create notification");
  }
}

function notificationSubject(type: string, entityRef?: string): string {
  const label = type
    .split("_")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return `${entityRef ? `${entityRef}: ` : ""}${label || "SRH Notification"}`;
}
