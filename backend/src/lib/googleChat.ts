import { logger } from "./logger";

const recentSpaceMessages = new Map<string, number>();
const DEDUPE_WINDOW_MS = 30_000;

function configuredWebhook(): string | null {
  return process.env.GOOGLE_CHAT_WEBHOOK_URL || null;
}

function dedupeKey(message: string, entityType?: string, entityId?: number, type?: string): string {
  return [type ?? "", entityType ?? "", entityId ?? "", message].join("|");
}

export async function sendGoogleChatSpaceMessage(input: {
  message: string;
  type?: string;
  entityType?: string;
  entityId?: number;
  entityRef?: string;
}): Promise<void> {
  const webhookUrl = configuredWebhook();
  if (!webhookUrl) return;

  const key = dedupeKey(input.message, input.entityType, input.entityId, input.type);
  const now = Date.now();
  const lastSent = recentSpaceMessages.get(key);
  if (lastSent && now - lastSent < DEDUPE_WINDOW_MS) return;
  recentSpaceMessages.set(key, now);

  for (const [entryKey, sentAt] of recentSpaceMessages) {
    if (now - sentAt > DEDUPE_WINDOW_MS) recentSpaceMessages.delete(entryKey);
  }

  const label = input.entityRef || input.entityType || input.type || "Notification";
  const text = `*${label}*\n${input.message}`;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Google Chat webhook failed (${response.status}): ${await response.text()}`);
    }
  } catch (err) {
    logger.error({ err, entityType: input.entityType, entityId: input.entityId }, "Google Chat space notification failed");
  }
}
