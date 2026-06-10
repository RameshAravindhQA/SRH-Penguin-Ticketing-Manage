import { Router } from "express";
import { q } from "@workspace/db";
import { createAuditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";

const router = Router();

function authorized(req: any): boolean {
  const expected = process.env.GOOGLE_CHAT_BOT_TOKEN;
  if (!expected) return false;
  return req.header("x-srh-chat-token") === expected || req.query.token === expected;
}

function senderEmail(body: any): string | null {
  return body?.user?.email || body?.message?.sender?.email || null;
}

async function actorFromEmail(email: string | null): Promise<{ id: number; name: string } | null> {
  if (!email) return null;
  const [user] = await q<{ id: number; name: string }>`SELECT TOP 1 id, name FROM users WHERE email = ${email}`;
  return user ?? null;
}

function textFromEvent(body: any): string {
  return String(body?.message?.argumentText || body?.message?.text || body?.common?.parameters?.text || "").trim();
}

function actionFromEvent(body: any): string {
  return String(body?.common?.invokedFunction || body?.action || "").trim();
}

function param(body: any, key: string): string | null {
  const params = body?.common?.parameters ?? {};
  if (params[key] != null) return String(params[key]);
  const list = body?.action?.parameters;
  if (Array.isArray(list)) return String(list.find((item: any) => item.key === key)?.value ?? "") || null;
  return null;
}

async function ticketByRef(ref: string): Promise<any | null> {
  const value = ref.trim();
  const [ticket] = /^TKT-/i.test(value)
    ? await q`SELECT TOP 1 * FROM tickets WHERE ticket_no = ${value}`
    : await q`SELECT TOP 1 * FROM tickets WHERE id = ${Number(value)}`;
  return ticket ?? null;
}

async function ticketStatus(ref: string): Promise<string> {
  const ticket = await ticketByRef(ref);
  if (!ticket) return `Ticket ${ref} was not found.`;
  return `${ticket.ticketNo}: ${ticket.subject}\nStatus: ${ticket.status}\nPriority: ${ticket.priority}`;
}

async function addComment(ref: string, content: string, actor: { id: number; name: string }): Promise<string> {
  const ticket = await ticketByRef(ref);
  if (!ticket) return `Ticket ${ref} was not found.`;
  await q`
    INSERT INTO ticket_comments (ticket_id, content, author_id, created_at)
    VALUES (${ticket.id}, ${content}, ${actor.id}, SYSDATETIMEOFFSET())`;
  await createAuditLog({ action: "chat_comment", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: actor.id, newValue: { content } });
  if (ticket.assignedToId && ticket.assignedToId !== actor.id) {
    await createNotification({ userId: ticket.assignedToId, type: "ticket_note", message: `${actor.name} commented on ${ticket.ticketNo}`, entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo });
  }
  return `Comment added to ${ticket.ticketNo}.`;
}

async function reviewTicket(ref: string, approved: boolean, actor: { id: number; name: string }, remarks?: string | null): Promise<string> {
  const ticket = await ticketByRef(ref);
  if (!ticket) return `Ticket ${ref} was not found.`;
  const [updated] = await q`
    UPDATE tickets SET status = ${approved ? "closed" : "reopened"},
      verified_at = SYSDATETIMEOFFSET(), verified_by_id = ${actor.id},
      verification_remarks = ${remarks ?? null}, closed_at = ${approved ? new Date() : null},
      reopened_at = ${approved ? null : new Date()}, reopen_remarks = ${approved ? null : remarks ?? "Rejected from Google Chat"},
      reopen_count = reopen_count + ${approved ? 0 : 1}, updated_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = ${ticket.id}`;
  await createAuditLog({ action: approved ? "chat_approve_close" : "chat_reject_reopen", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: actor.id, newValue: { approved, remarks } });
  if (updated.createdById && updated.createdById !== actor.id) {
    await createNotification({ userId: updated.createdById, type: approved ? "ticket_closed" : "ticket_rejected", message: `${ticket.ticketNo} was ${approved ? "approved and closed" : "rejected and reopened"} from Google Chat`, entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo });
  }
  return `${ticket.ticketNo} ${approved ? "approved and closed" : "rejected and reopened"}.`;
}

async function handleCommand(body: any, actor: { id: number; name: string }): Promise<string> {
  const action = actionFromEvent(body);
  const ticketRef = param(body, "ticket") ?? param(body, "ticketNo") ?? "";
  const remarks = param(body, "remarks");
  if (action === "approveTicket") return reviewTicket(ticketRef, true, actor, remarks);
  if (action === "rejectTicket") return reviewTicket(ticketRef, false, actor, remarks);

  const text = textFromEvent(body);
  const [command = "", ref = "", ...rest] = text.split(/\s+/);
  if (/^\/?ticket$/i.test(command) && ref) return ticketStatus(ref);
  if (/^\/?comment$/i.test(command) && ref && rest.length) return addComment(ref, rest.join(" "), actor);
  if (/^\/?approve$/i.test(command) && ref) return reviewTicket(ref, true, actor, rest.join(" ") || null);
  if (/^\/?reject$/i.test(command) && ref) return reviewTicket(ref, false, actor, rest.join(" ") || null);
  return "Commands: /ticket TKT-1001, /comment TKT-1001 text, /approve TKT-1001, /reject TKT-1001 reason";
}

router.post("/google/chat/events", async (req, res): Promise<void> => {
  if (!authorized(req)) { res.status(401).json({ text: "Unauthorized Google Chat request" }); return; }
  const actor = await actorFromEmail(senderEmail(req.body));
  if (!actor) { res.status(403).json({ text: "Your Google Chat email is not mapped to an SRH user." }); return; }
  res.json({ text: await handleCommand(req.body, actor) });
});

export default router;
