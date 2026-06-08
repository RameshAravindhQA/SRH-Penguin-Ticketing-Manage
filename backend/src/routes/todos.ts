import { Router } from "express";
import { db, todosTable, ticketsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

async function getNextTicketNo(): Promise<string> {
  const [latest] = await db.select().from(ticketsTable).orderBy(sql`${ticketsTable.id} desc`).limit(1);
  if (latest) {
    const num = parseInt(latest.ticketNo.replace("TKT-", ""), 10);
    return `TKT-${num + 1}`;
  }
  return `TKT-1001`;
}

function formatTodo(t: any, assignedToName?: string | null) {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    status: t.status,
    priority: t.priority,
    type: t.type,
    dueDate: t.dueDate?.toISOString() ?? null,
    reminderAt: t.reminderAt?.toISOString() ?? null,
    assignedToId: t.assignedToId ?? null,
    assignedToName: assignedToName ?? null,
    createdById: t.createdById,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/todos", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { type, status, assignedTo } = req.query as Record<string, string>;
  let todos = await db.select().from(todosTable).where(eq(todosTable.createdById, authUser.userId)).orderBy(sql`${todosTable.createdAt} desc`);
  if (type) todos = todos.filter(t => t.type === type);
  if (status) todos = todos.filter(t => t.status === status);
  res.json(todos.map(t => formatTodo(t)));
});

router.post("/todos", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { title, description, priority, type, dueDate, reminderAt, assignedToId } = req.body;
  if (!title || !priority || !type) { res.status(400).json({ error: "Title, priority and type required" }); return; }
  const [todo] = await db.insert(todosTable).values({
    title,
    description: description ?? null,
    priority,
    type,
    dueDate: dueDate ? new Date(dueDate) : null,
    reminderAt: reminderAt ? new Date(reminderAt) : null,
    assignedToId: assignedToId ?? null,
    createdById: authUser.userId,
  }).returning();
  await createAuditLog({ action: "create", entityType: "todo", entityId: todo.id, entityRef: todo.title, userId: authUser.userId, newValue: { title: todo.title } });
  res.status(201).json(formatTodo(todo));
});

router.patch("/todos/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { title, description, priority, dueDate, reminderAt } = req.body;
  const [todo] = await db.update(todosTable).set({
    ...(title ? { title } : {}),
    ...(description != null ? { description } : {}),
    ...(priority ? { priority } : {}),
    ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
    ...(reminderAt !== undefined ? { reminderAt: reminderAt ? new Date(reminderAt) : null } : {}),
  }).where(eq(todosTable.id, id)).returning();
  if (!todo) { res.status(404).json({ error: "Todo not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "update", entityType: "todo", entityId: todo.id, entityRef: todo.title, userId: authUser.userId });
  res.json(formatTodo(todo));
});

router.delete("/todos/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [todo] = await db.select().from(todosTable).where(eq(todosTable.id, id)).limit(1);
  await db.delete(todosTable).where(eq(todosTable.id, id));
  const authUser = (req as any).user;
  await createAuditLog({ action: "delete", entityType: "todo", entityId: id, entityRef: todo?.title, userId: authUser.userId });
  res.sendStatus(204);
});

router.patch("/todos/:id/complete", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { completed } = req.body;
  const [todo] = await db.update(todosTable).set({
    status: completed ? "completed" : "pending",
    completedAt: completed ? new Date() : null,
  }).where(eq(todosTable.id, id)).returning();
  if (!todo) { res.status(404).json({ error: "Todo not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({
    action: "status_change",
    entityType: "todo",
    entityId: todo.id,
    entityRef: todo.title,
    userId: authUser.userId,
    newValue: { status: todo.status },
  });
  res.json(formatTodo(todo));
});

router.post("/todos/:id/convert-ticket", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const [todo] = await db.select().from(todosTable).where(eq(todosTable.id, id)).limit(1);
  if (!todo) { res.status(404).json({ error: "Todo not found" }); return; }

  const ticketNo = await getNextTicketNo();
  const [ticket] = await db.insert(ticketsTable).values({
    ticketNo,
    subject: todo.title,
    description: todo.description ?? null,
    priority: todo.priority,
    type: "general",
    createdById: authUser.userId,
    status: "yts",
  }).returning();

  await db.update(todosTable).set({ status: "completed", completedAt: new Date() }).where(eq(todosTable.id, id));
  await createAuditLog({ action: "convert_todo_ticket", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId });

  res.status(201).json({
    id: ticket.id, ticketNo: ticket.ticketNo, subject: ticket.subject, description: ticket.description ?? null,
    status: ticket.status, priority: ticket.priority, category: null, categoryId: null, type: ticket.type,
    createdById: ticket.createdById, createdByName: null, assignedToId: null, assignedToName: null, assignedToAvatar: null,
    projectId: null, projectName: null, dueDate: null, resolvedAt: null, closedAt: null, pendingDays: 0,
    slaBreached: false, createdAt: ticket.createdAt.toISOString(), updatedAt: ticket.updatedAt.toISOString(),
  });
});

export default router;
