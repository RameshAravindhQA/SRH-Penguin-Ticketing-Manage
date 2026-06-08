import { Router } from "express";
import { db, ticketsTable, ticketCommentsTable, ticketHistoryTable, ticketAttachmentsTable, usersTable, departmentsTable, categoriesTable, subCategoriesTable, projectsTable } from "@workspace/db";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";

const router = Router();
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

let ticketCounter = 1000;

async function getNextTicketNo(): Promise<string> {
  const [latest] = await db.select().from(ticketsTable).orderBy(sql`${ticketsTable.id} desc`).limit(1);
  if (latest) {
    const num = parseInt(latest.ticketNo.replace("TKT-", ""), 10);
    return `TKT-${num + 1}`;
  }
  return `TKT-1001`;
}

async function enrichTicket(t: any) {
  let assignedToName: string | null = null;
  let assignedToAvatar: string | null = null;
  let assignedDepartmentName: string | null = null;
  let createdByName: string | null = null;
  let projectName: string | null = null;
  let category: string | null = null;
  let subCategory: string | null = null;

  if (t.assignedToId) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, t.assignedToId)).limit(1);
    assignedToName = u?.name ?? null;
    assignedToAvatar = u?.avatarUrl ?? null;
  }
  if (t.assignedDepartmentId) {
    const [d] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, t.assignedDepartmentId)).limit(1);
    assignedDepartmentName = d?.name ?? null;
  }
  if (t.createdById) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, t.createdById)).limit(1);
    createdByName = u?.name ?? null;
  }
  if (t.projectId) {
    const [p] = await db.select().from(projectsTable).where(eq(projectsTable.id, t.projectId)).limit(1);
    projectName = p?.title ?? null;
  }
  if (t.categoryId) {
    const [c] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, t.categoryId)).limit(1);
    category = c?.name ?? null;
  }
  if (t.subCategoryId) {
    const [s] = await db.select().from(subCategoriesTable).where(eq(subCategoriesTable.id, t.subCategoryId)).limit(1);
    subCategory = s?.name ?? null;
  }

  const now = new Date();
  const created = new Date(t.createdAt);
  const pendingDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

  return {
    id: t.id,
    ticketNo: t.ticketNo,
    subject: t.subject,
    description: t.description ?? null,
    status: t.status,
    priority: t.priority,
    category: category ?? null,
    categoryId: t.categoryId ?? null,
    subCategory: subCategory ?? null,
    subCategoryId: t.subCategoryId ?? null,
    type: t.type,
    createdById: t.createdById,
    createdByName,
    assignedToId: t.assignedToId ?? null,
    assignedToName,
    assignedToAvatar,
    assignedDepartmentId: t.assignedDepartmentId ?? null,
    assignedDepartmentName,
    projectId: t.projectId ?? null,
    projectName,
    dueDate: t.dueDate?.toISOString() ?? null,
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
    closedAt: t.closedAt?.toISOString() ?? null,
    pendingDays,
    slaBreached: t.slaBreached,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

router.get("/tickets", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { status, priority, search, myTickets, fromDate, toDate } = req.query as Record<string, string>;
  let tickets = await db.select().from(ticketsTable).orderBy(sql`${ticketsTable.createdAt} desc`);

  if (myTickets === "true") {
    tickets = tickets.filter(t => t.assignedToId === authUser.userId || t.createdById === authUser.userId);
  }
  if (status) tickets = tickets.filter(t => t.status === status);
  if (priority) tickets = tickets.filter(t => t.priority === priority);
  if (search) {
    const s = search.toLowerCase();
    tickets = tickets.filter(t => t.subject.toLowerCase().includes(s) || t.ticketNo.toLowerCase().includes(s));
  }

  const result = await Promise.all(tickets.map(enrichTicket));
  res.json(result);
});

router.post("/tickets", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { subject, description, priority, categoryId, subCategoryId, type, assignedToId, projectId, dueDate } = req.body;
  if (!subject || !priority || !type) { res.status(400).json({ error: "Subject, priority and type required" }); return; }

  const ticketNo = await getNextTicketNo();
  const [ticket] = await db.insert(ticketsTable).values({
    ticketNo,
    subject,
    description: description ?? null,
    priority,
    categoryId: categoryId ?? null,
    subCategoryId: subCategoryId ?? null,
    type,
    createdById: authUser.userId,
    assignedToId: assignedToId ?? null,
    projectId: projectId ?? null,
    dueDate: dueDate ? new Date(dueDate) : null,
    status: assignedToId ? "open" : "yts",
  }).returning();

  await createAuditLog({ action: "create", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { subject } });

  if (assignedToId && assignedToId !== authUser.userId) {
    await createNotification({ userId: assignedToId, type: "ticket_assigned", message: `New ticket ${ticketNo} has been assigned to you`, entityType: "ticket", entityId: ticket.id, entityRef: ticketNo });
  }

  res.status(201).json(await enrichTicket(ticket));
});

router.get("/tickets/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  res.json(await enrichTicket(ticket));
});

router.patch("/tickets/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { subject, description, priority, categoryId, subCategoryId, dueDate } = req.body;
  const [ticket] = await db.update(ticketsTable).set({
    ...(subject ? { subject } : {}),
    ...(description != null ? { description } : {}),
    ...(priority ? { priority } : {}),
    ...(categoryId != null ? { categoryId } : {}),
    ...(subCategoryId != null ? { subCategoryId } : {}),
    ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
  }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "update", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId });
  res.json(await enrichTicket(ticket));
});

router.delete("/tickets/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(ticketsTable).where(eq(ticketsTable.id, id));
  const authUser = (req as any).user;
  await createAuditLog({ action: "delete", entityType: "ticket", entityId: id, userId: authUser.userId });
  res.sendStatus(204);
});

router.patch("/tickets/:id/status", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status, remarks } = req.body;
  if (!status) { res.status(400).json({ error: "Status required" }); return; }

  const updates: Record<string, any> = { status, remarks: remarks ?? null };
  if (status === "completed") updates.resolvedAt = new Date();
  if (status === "closed") updates.closedAt = new Date();

  const [ticket] = await db.update(ticketsTable).set(updates).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "status_change", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { status } });
  if (ticket.createdById !== authUser.userId) {
    await createNotification({ userId: ticket.createdById, type: "ticket_status_changed", message: `Ticket ${ticket.ticketNo} status changed to ${status}`, entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo });
  }
  res.json(await enrichTicket(ticket));
});

router.patch("/tickets/:id/assign", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { assignedToId, remarks } = req.body;
  if (!assignedToId) { res.status(400).json({ error: "assignedToId required" }); return; }
  const [ticket] = await db.update(ticketsTable).set({ assignedToId, assignedDepartmentId: null, status: "assigned", remarks: remarks ?? null }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "assign", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { assignedToId } });
  await createNotification({ userId: assignedToId, type: "ticket_assigned", message: `Ticket ${ticket.ticketNo} has been assigned to you`, entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo });
  res.json(await enrichTicket(ticket));
});

router.patch("/tickets/:id/reassign", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { assignedToId, remarks } = req.body;
  if (!assignedToId) { res.status(400).json({ error: "assignedToId required" }); return; }
  const [ticket] = await db.update(ticketsTable).set({ assignedToId, assignedDepartmentId: null, status: "assigned", remarks: remarks ?? null }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "reassign", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { assignedToId, remarks } });
  await createNotification({ userId: assignedToId, type: "ticket_reassigned", message: `Ticket ${ticket.ticketNo} has been reassigned to you`, entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo });
  res.json(await enrichTicket(ticket));
});

router.patch("/tickets/:id/forward-department", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { departmentId, remarks } = req.body;
  if (!departmentId) { res.status(400).json({ error: "departmentId required" }); return; }
  const [department] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, Number(departmentId))).limit(1);
  if (!department) { res.status(404).json({ error: "Department not found" }); return; }
  const departmentUsers = await db.select().from(usersTable).where(eq(usersTable.departmentId, Number(departmentId)));
  const assignedToId = department.headId ?? departmentUsers[0]?.id ?? null;
  const [ticket] = await db.update(ticketsTable).set({
    assignedDepartmentId: Number(departmentId),
    assignedToId,
    status: "forwarded",
    remarks: remarks ?? null,
  }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "forward_department", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { departmentId, assignedToId, remarks } });
  await Promise.all(departmentUsers.map(user => createNotification({ userId: user.id, type: "ticket_forwarded_department", message: `Ticket ${ticket.ticketNo} has been forwarded to ${department.name}`, entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo })));
  res.json(await enrichTicket(ticket));
});

router.post("/tickets/:id/forward", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { forwardToId, remarks } = req.body;
  if (!forwardToId) { res.status(400).json({ error: "forwardToId required" }); return; }
  const [ticket] = await db.update(ticketsTable).set({ assignedToId: forwardToId, status: "forwarded", remarks: remarks ?? null }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "forward", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { forwardToId } });
  await createNotification({ userId: forwardToId, type: "ticket_forwarded", message: `Ticket ${ticket.ticketNo} has been forwarded to you`, entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo });
  res.json(await enrichTicket(ticket));
});

router.get("/tickets/:id/comments", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const comments = await db.select().from(ticketCommentsTable).where(eq(ticketCommentsTable.ticketId, id)).orderBy(sql`${ticketCommentsTable.createdAt} asc`);
  const userIds = [...new Set(comments.map(c => c.authorId))];
  const users = userIds.length > 0 ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(userIds.map(uid => sql`${uid}`), sql`, `)}]::int[])`) : [];
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(comments.map(c => {
    const u = userMap.get(c.authorId);
    return { id: c.id, content: c.content, authorId: c.authorId, authorName: u?.name ?? null, authorAvatar: u?.avatarUrl ?? null, createdAt: c.createdAt.toISOString() };
  }));
});

router.post("/tickets/:id/comments", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "Content required" }); return; }
  const [comment] = await db.insert(ticketCommentsTable).values({ ticketId: id, content, authorId: authUser.userId }).returning();
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  await createAuditLog({ action: "comment", entityType: "ticket", entityId: id, entityRef: ticket?.ticketNo, userId: authUser.userId, newValue: { content } });
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.userId)).limit(1);
  res.status(201).json({ id: comment.id, content: comment.content, authorId: comment.authorId, authorName: u?.name ?? null, authorAvatar: u?.avatarUrl ?? null, createdAt: comment.createdAt.toISOString() });
});

router.get("/tickets/:id/attachments", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const attachments = await db.select().from(ticketAttachmentsTable).where(eq(ticketAttachmentsTable.ticketId, id)).orderBy(sql`${ticketAttachmentsTable.createdAt} desc`);
  res.json(attachments.map(a => ({
    id: a.id,
    ticketId: a.ticketId,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    uploadedById: a.uploadedById,
    createdAt: a.createdAt.toISOString(),
  })));
});

router.post("/tickets/:id/attachments", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { files } = req.body as { files?: Array<{ fileName: string; mimeType: string; sizeBytes: number; contentBase64: string }> };
  if (!Array.isArray(files) || files.length === 0) { res.status(400).json({ error: "At least one file is required" }); return; }
  if (files.some(file => !file.fileName || !file.mimeType || !file.contentBase64 || !file.sizeBytes)) { res.status(400).json({ error: "Invalid file payload" }); return; }
  if (files.some(file => file.sizeBytes > MAX_ATTACHMENT_BYTES)) { res.status(400).json({ error: "Each attachment must be 10 MB or smaller" }); return; }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const inserted = await db.insert(ticketAttachmentsTable).values(files.map(file => ({
    ticketId: id,
    fileName: file.fileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    contentBase64: file.contentBase64,
    uploadedById: authUser.userId,
  }))).returning();
  await createAuditLog({ action: "attachment_upload", entityType: "ticket", entityId: id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { count: inserted.length } });
  res.status(201).json(inserted.map(a => ({
    id: a.id,
    ticketId: a.ticketId,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    uploadedById: a.uploadedById,
    createdAt: a.createdAt.toISOString(),
  })));
});

router.get("/tickets/:ticketId/attachments/:attachmentId/download", authMiddleware, async (req, res): Promise<void> => {
  const ticketId = parseInt(Array.isArray(req.params.ticketId) ? req.params.ticketId[0] : req.params.ticketId, 10);
  const attachmentId = parseInt(Array.isArray(req.params.attachmentId) ? req.params.attachmentId[0] : req.params.attachmentId, 10);
  const [attachment] = await db.select().from(ticketAttachmentsTable).where(and(eq(ticketAttachmentsTable.id, attachmentId), eq(ticketAttachmentsTable.ticketId, ticketId))).limit(1);
  if (!attachment) { res.status(404).json({ error: "Attachment not found" }); return; }
  const buffer = Buffer.from(attachment.contentBase64, "base64");
  res.setHeader("Content-Type", attachment.mimeType);
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
  res.send(buffer);
});

router.delete("/tickets/:ticketId/attachments/:attachmentId", authMiddleware, async (req, res): Promise<void> => {
  const ticketId = parseInt(Array.isArray(req.params.ticketId) ? req.params.ticketId[0] : req.params.ticketId, 10);
  const attachmentId = parseInt(Array.isArray(req.params.attachmentId) ? req.params.attachmentId[0] : req.params.attachmentId, 10);
  await db.delete(ticketAttachmentsTable).where(and(eq(ticketAttachmentsTable.id, attachmentId), eq(ticketAttachmentsTable.ticketId, ticketId)));
  const authUser = (req as any).user;
  await createAuditLog({ action: "attachment_delete", entityType: "ticket", entityId: ticketId, userId: authUser.userId, newValue: { attachmentId } });
  res.sendStatus(204);
});

// ── Worklist ─────────────────────────────────────────────────────────────────

router.get("/worklist", authMiddleware, async (req, res): Promise<void> => {
  const { category, priority, search } = req.query as Record<string, string>;
  let tickets = await db.select().from(ticketsTable).where(eq(ticketsTable.status, "yts")).orderBy(sql`${ticketsTable.createdAt} desc`);
  if (priority) tickets = tickets.filter(t => t.priority === priority);
  if (search) {
    const s = search.toLowerCase();
    tickets = tickets.filter(t => t.subject.toLowerCase().includes(s) || t.ticketNo.toLowerCase().includes(s));
  }
  const result = await Promise.all(tickets.map(enrichTicket));
  res.json(result);
});

router.post("/worklist/:id/pick", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const [ticket] = await db.update(ticketsTable).set({ assignedToId: authUser.userId, status: "in_progress" }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  await createAuditLog({ action: "pick", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId });
  res.json(await enrichTicket(ticket));
});

export default router;
