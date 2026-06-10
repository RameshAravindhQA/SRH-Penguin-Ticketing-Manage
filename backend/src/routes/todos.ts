import { Router } from "express";
import { q, qRaw } from "@workspace/db";
import { authMiddleware } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";
import { deleteEntityReminder, upsertEntityReminder } from "../lib/googleIntegration";

const router = Router();

function paramId(value: string | string[]): number {
  return parseInt(Array.isArray(value) ? value[0] : value, 10);
}

async function getNextTicketNo(): Promise<string> {
  const [latest] = await q<{ ticketNo: string }>`SELECT TOP 1 ticket_no AS ticketNo FROM tickets ORDER BY id DESC`;
  if (latest) {
    const num = parseInt(latest.ticketNo.replace("TKT-", ""), 10);
    return `TKT-${num + 1}`;
  }
  return "TKT-1001";
}

function formatTodo(t: any) {
  return {
    id: t.id, title: t.title, description: t.description ?? null,
    status: t.status, priority: t.priority, type: t.type,
    dueDate: t.dueDate instanceof Date ? t.dueDate.toISOString() : t.dueDate ?? null,
    reminderAt: t.reminderAt instanceof Date ? t.reminderAt.toISOString() : t.reminderAt ?? null,
    assignedToId: t.assignedToId ?? null, assignedToName: null,
    createdById: t.createdById,
    completedAt: t.completedAt instanceof Date ? t.completedAt.toISOString() : t.completedAt ?? null,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
  };
}

router.get("/todos", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { type, status } = req.query as Record<string, string>;
  let todos = await q`SELECT * FROM todos WHERE created_by_id = ${authUser.userId} ORDER BY created_at DESC`;
  if (type) todos = todos.filter((t: any) => t.type === type);
  if (status) todos = todos.filter((t: any) => t.status === status);
  res.json(todos.map(formatTodo));
});

router.post("/todos", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { title, description, priority, type, dueDate, reminderAt, assignedToId } = req.body;
  if (!title || !priority || !type) { res.status(400).json({ error: "Title, priority and type required" }); return; }
  const [todo] = await q`
    INSERT INTO todos (title, description, priority, type, due_date, reminder_at, assigned_to_id, created_by_id, status, created_at, updated_at)
    OUTPUT INSERTED.*
    VALUES (${title}, ${description ?? null}, ${priority}, ${type},
            ${dueDate ? new Date(dueDate) : null}, ${reminderAt ? new Date(reminderAt) : null},
            ${assignedToId ?? null}, ${authUser.userId}, 'pending', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  await createAuditLog({ action: "create", entityType: "todo", entityId: todo.id, entityRef: todo.title, userId: authUser.userId, newValue: { title: todo.title } });
  if (assignedToId && Number(assignedToId) !== authUser.userId) {
    await createNotification({ userId: Number(assignedToId), type: "todo_assigned", message: `Todo "${title}" has been assigned to you`, entityType: "todo", entityId: (todo as any).id, entityRef: title });
  }
  await upsertEntityReminder({
    userId: authUser.userId,
    title: `Todo: ${title}`,
    description,
    startDate: reminderAt ?? dueDate ?? null,
    type: "todo",
    entityType: "todo",
    entityId: (todo as any).id,
    attendeeIds: [assignedToId, authUser.userId].filter(Boolean).map(Number),
    createMeet: false,
  });
  res.status(201).json(formatTodo(todo));
});

router.patch("/todos/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const { title, description, priority, dueDate, reminderAt } = req.body;
  const sets: string[] = ["updated_at = SYSDATETIMEOFFSET()"];
  const params: Record<string, any> = { id };
  if (title) { sets.push("title = @title"); params.title = title; }
  if (description != null) { sets.push("description = @desc"); params.desc = description; }
  if (priority) { sets.push("priority = @prio"); params.prio = priority; }
  if (dueDate !== undefined) { sets.push("due_date = @dd"); params.dd = dueDate ? new Date(dueDate) : null; }
  if (reminderAt !== undefined) { sets.push("reminder_at = @ra"); params.ra = reminderAt ? new Date(reminderAt) : null; }
  const [todo] = await qRaw(`UPDATE todos SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id`, params);
  if (!todo) { res.status(404).json({ error: "Todo not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "update", entityType: "todo", entityId: todo.id, entityRef: todo.title, userId: authUser.userId });
  await upsertEntityReminder({
    userId: authUser.userId,
    title: `Todo: ${(todo as any).title}`,
    description: (todo as any).description ?? null,
    startDate: (todo as any).reminderAt ?? (todo as any).dueDate ?? null,
    type: "todo",
    entityType: "todo",
    entityId: (todo as any).id,
    attendeeIds: [(todo as any).assignedToId, (todo as any).createdById].filter(Boolean).map(Number),
    createMeet: false,
  });
  res.json(formatTodo(todo));
});

router.delete("/todos/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const [todo] = await q`SELECT TOP 1 * FROM todos WHERE id = ${id}`;
  await q`DELETE FROM todos WHERE id = ${id}`;
  await deleteEntityReminder("todo", id);
  const authUser = (req as any).user;
  await createAuditLog({ action: "delete", entityType: "todo", entityId: id, entityRef: (todo as any)?.title, userId: authUser.userId });
  res.sendStatus(204);
});

router.patch("/todos/:id/complete", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const { completed } = req.body;
  const [todo] = await q`
    UPDATE todos SET status = ${completed ? "completed" : "pending"},
      completed_at = ${completed ? new Date() : null}, updated_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = ${id}`;
  if (!todo) { res.status(404).json({ error: "Todo not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "status_change", entityType: "todo", entityId: (todo as any).id, entityRef: (todo as any).title, userId: authUser.userId, newValue: { status: (todo as any).status } });
  res.json(formatTodo(todo));
});

router.post("/todos/:id/convert-ticket", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const authUser = (req as any).user;
  const [todo] = await q`SELECT TOP 1 * FROM todos WHERE id = ${id}`;
  if (!todo) { res.status(404).json({ error: "Todo not found" }); return; }
  const ticketNo = await getNextTicketNo();
  const [ticket] = await q`
    INSERT INTO tickets (ticket_no, subject, description, priority, type, created_by_id, status, reopen_count, is_external, sla_breached, created_at, updated_at)
    OUTPUT INSERTED.*
    VALUES (${ticketNo}, ${(todo as any).title}, ${(todo as any).description ?? null}, ${(todo as any).priority}, 'general',
            ${authUser.userId}, 'yts', 0, 0, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  await q`UPDATE todos SET status = 'completed', completed_at = SYSDATETIMEOFFSET(), updated_at = SYSDATETIMEOFFSET() WHERE id = ${id}`;
  await createAuditLog({ action: "convert_todo_ticket", entityType: "ticket", entityId: (ticket as any).id, entityRef: (ticket as any).ticketNo, userId: authUser.userId });
  res.status(201).json({
    id: (ticket as any).id, ticketNo: (ticket as any).ticketNo, subject: (ticket as any).subject,
    description: (ticket as any).description ?? null, status: (ticket as any).status,
    priority: (ticket as any).priority, category: null, categoryId: null, type: (ticket as any).type,
    createdById: (ticket as any).createdById, createdByName: null, assignedToId: null, assignedToName: null,
    assignedToAvatar: null, projectId: null, projectName: null, dueDate: null, resolvedAt: null,
    closedAt: null, pendingDays: 0, slaBreached: false,
    createdAt: (ticket as any).createdAt instanceof Date ? (ticket as any).createdAt.toISOString() : (ticket as any).createdAt,
    updatedAt: (ticket as any).updatedAt instanceof Date ? (ticket as any).updatedAt.toISOString() : (ticket as any).updatedAt,
  });
});

export default router;
