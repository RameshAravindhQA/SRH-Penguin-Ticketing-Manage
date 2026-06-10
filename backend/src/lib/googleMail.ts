import { q } from "@workspace/db";
import { logger } from "./logger";
import { getGoogleAccessToken } from "./googleIntegration";

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1";

function isConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    process.env.GOOGLE_GMAIL_SENDER
  );
}

function base64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function escapeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

async function userEmail(userId: number): Promise<string | null> {
  const [user] = await q<{ email: string | null }>`SELECT TOP 1 email FROM users WHERE id = ${userId}`;
  return user?.email || null;
}

export async function sendGmailNotification(input: {
  userId: number;
  subject: string;
  text: string;
  entityRef?: string;
}): Promise<void> {
  if (!isConfigured()) return;
  const to = await userEmail(input.userId);
  if (!to) return;

  const sender = process.env.GOOGLE_GMAIL_SENDER ?? "me";
  const from = process.env.GOOGLE_GMAIL_FROM || sender;
  const subject = escapeHeader(input.subject);
  const text = `${input.text}${input.entityRef ? `\n\nReference: ${input.entityRef}` : ""}`;
  const raw = [
    `From: ${escapeHeader(from)}`,
    `To: ${escapeHeader(to)}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    text,
  ].join("\r\n");

  try {
    const token = await getGoogleAccessToken();
    const response = await fetch(`${GMAIL_BASE}/users/${encodeURIComponent(sender)}/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: base64Url(raw) }),
    });
    if (!response.ok) {
      throw new Error(`Gmail send failed (${response.status}): ${await response.text()}`);
    }
  } catch (err) {
    logger.error({ err, userId: input.userId }, "Gmail notification failed");
  }
}
