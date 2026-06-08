import { Router } from "express";
import {
  db,
  ticketsTable,
  ticketAssignmentsTable,
  ticketAssignmentCcTable,
  ticketCommentsTable,
  ticketHistoryTable,
  ticketAttachmentsTable,
  ticketRoutineTable,
  ticketRoutineUsersTable,
  ticketRoutineScheduleDaysTable,
  usersTable,
  departmentsTable,
  categoriesTable,
  subCategoriesTable,
  projectsTable,
  timesheetsTable,
} from "@workspace/db";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";

const router = Router();
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

let ticketCounter = 1000;

function hierarchyRank(user: any): number {
  const value = `${user?.role ?? ""} ${user?.designation ?? ""}`.toLowerCase().replace(/\s+/g, "_");
  if (value.includes("admin")) return 5;
  if (value.includes("manager") && !value.includes("asst") && !value.includes("assistant")) return 4;
  if (value.includes("asst_manager") || value.includes("assistant_manager") || value.includes("project_manager")) return 3;
  if (value.includes("team_lead") || value.includes("team_leader") || value.includes("lead")) return 2;
  return 1;
}

async function canAssignTicket(creatorId: number, assignedToId: number): Promise<{ ok: boolean; message?: string }> {
  if (creatorId === assignedToId) return { ok: true };
  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, creatorId)).limit(1);
  const [assignee] = await db.select().from(usersTable).where(eq(usersTable.id, assignedToId)).limit(1);
  if (!creator || !assignee) return { ok: false, message: "Creator or assignee not found" };
  const creatorRank = hierarchyRank(creator);
  const assigneeRank = hierarchyRank(assignee);
  if (creatorRank >= 5) return { ok: true };
  if (assigneeRank > creatorRank) return { ok: false, message: "Cannot assign a ticket to a higher hierarchy user" };
  if (creatorRank >= 3) return { ok: true };
  if (assignee.reportingManagerId === creatorId) return { ok: true };
  return { ok: false, message: "You can assign tickets only to yourself or users in your reporting tree" };
}

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
    sourceDepartment: t.sourceDepartment ?? null,
    projectId: t.projectId ?? null,
    projectName,
    systemType: t.systemType ?? null,
    systemSubType: t.systemSubType ?? null,
    systemTypeNo: t.systemTypeNo ?? null,
    serviceType: t.serviceType ?? null,
    institute: t.institute ?? null,
    location: t.location ?? null,
    ownerId: t.ownerId ?? null,
    associateId: t.associateId ?? null,
    associateCcIds: t.associateCcIds ?? null,
    assignedById: t.assignedById ?? null,
    assignedAt: t.assignedAt?.toISOString() ?? null,
    startedAt: t.startedAt?.toISOString() ?? null,
    dueDate: t.dueDate?.toISOString() ?? null,
    expectedCloseDate: t.expectedCloseDate?.toISOString() ?? null,
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
    closedAt: t.closedAt?.toISOString() ?? null,
    submittedForVerificationAt: t.submittedForVerificationAt?.toISOString() ?? null,
    verifiedAt: t.verifiedAt?.toISOString() ?? null,
    verifiedById: t.verifiedById ?? null,
    verificationRemarks: t.verificationRemarks ?? null,
    cancelledAt: t.cancelledAt?.toISOString() ?? null,
    cancelledById: t.cancelledById ?? null,
    reopenCount: t.reopenCount ?? 0,
    reopenedAt: t.reopenedAt?.toISOString() ?? null,
    reopenRemarks: t.reopenRemarks ?? null,
    reviewSchedule: t.reviewSchedule ?? null,
    reviewDays: t.reviewDays ?? null,
    reviewDuration: t.reviewDuration ?? null,
    isExternal: t.isExternal ?? false,
    organizationName: t.organizationName ?? null,
    providerName: t.providerName ?? null,
    externalPersonRole: t.externalPersonRole ?? null,
    externalPhoneNo: t.externalPhoneNo ?? null,
    supportingPerson: t.supportingPerson ?? null,
    fileGroupId: t.fileGroupId ?? null,
    pendingDays,
    slaBreached: t.slaBreached,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

async function addAssignmentEvent(input: {
  ticketId: number;
  assignedToId: number;
  assignedById?: number | null;
  status?: string;
  remarks?: string | null;
  previousAssignmentId?: number | null;
  reopenCount?: number;
}) {
  const [assignment] = await db.insert(ticketAssignmentsTable).values({
    ticketId: input.ticketId,
    assignedToId: input.assignedToId,
    assignedById: input.assignedById ?? null,
    status: input.status ?? "assigned",
    remarks: input.remarks ?? null,
    previousAssignmentId: input.previousAssignmentId ?? null,
    reopenCount: input.reopenCount ?? 0,
  }).returning();
  return assignment;
}

function csv(value: unknown): string | null {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(",");
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
  const {
    subject,
    description,
    priority,
    categoryId,
    subCategoryId,
    type,
    assignedToId,
    projectId,
    dueDate,
    expectedCloseDate,
    sourceDepartment,
    systemType,
    systemSubType,
    systemTypeNo,
    serviceType,
    institute,
    location,
    ownerId,
    associateId,
    associateCcIds,
    reviewSchedule,
    reviewDays,
    reviewDuration,
    isExternal,
    organizationName,
    providerName,
    externalPersonRole,
    externalPhoneNo,
    supportingPerson,
    fileGroupId,
  } = req.body;
  if (!subject || !priority || !type) { res.status(400).json({ error: "Subject, priority and type required" }); return; }
  if (assignedToId) {
    const allowed = await canAssignTicket(authUser.userId, Number(assignedToId));
    if (!allowed.ok) {
      res.status(403).json({ error: allowed.message ?? "Assignment is not allowed by hierarchy" });
      return;
    }
  }

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
    assignedById: assignedToId ? authUser.userId : null,
    assignedAt: assignedToId ? new Date() : null,
    projectId: projectId ?? null,
    dueDate: dueDate ? new Date(dueDate) : null,
    expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
    sourceDepartment: sourceDepartment ?? null,
    systemType: systemType ?? null,
    systemSubType: systemSubType ?? null,
    systemTypeNo: systemTypeNo ?? null,
    serviceType: serviceType ?? null,
    institute: institute ?? null,
    location: location ?? null,
    ownerId: ownerId ?? null,
    associateId: associateId ?? null,
    associateCcIds: csv(associateCcIds),
    reviewSchedule: reviewSchedule ?? null,
    reviewDays: csv(reviewDays),
    reviewDuration: reviewDuration ?? null,
    isExternal: !!isExternal,
    organizationName: organizationName ?? null,
    providerName: providerName ?? null,
    externalPersonRole: externalPersonRole ?? null,
    externalPhoneNo: externalPhoneNo ?? null,
    supportingPerson: supportingPerson ?? null,
    fileGroupId: fileGroupId ?? null,
    status: assignedToId ? "open" : "yts",
  }).returning();

  if (assignedToId) {
    await addAssignmentEvent({ ticketId: ticket.id, assignedToId: Number(assignedToId), assignedById: authUser.userId, status: "assigned" });
  }

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
  const {
    subject,
    description,
    priority,
    categoryId,
    subCategoryId,
    dueDate,
    expectedCloseDate,
    sourceDepartment,
    systemType,
    systemSubType,
    systemTypeNo,
    serviceType,
    institute,
    location,
    ownerId,
    associateId,
    associateCcIds,
    reviewSchedule,
    reviewDays,
    reviewDuration,
    isExternal,
    organizationName,
    providerName,
    externalPersonRole,
    externalPhoneNo,
    supportingPerson,
    fileGroupId,
  } = req.body;
  const [ticket] = await db.update(ticketsTable).set({
    ...(subject ? { subject } : {}),
    ...(description != null ? { description } : {}),
    ...(priority ? { priority } : {}),
    ...(categoryId != null ? { categoryId } : {}),
    ...(subCategoryId != null ? { subCategoryId } : {}),
    ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
    ...(expectedCloseDate !== undefined ? { expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null } : {}),
    ...(sourceDepartment !== undefined ? { sourceDepartment } : {}),
    ...(systemType !== undefined ? { systemType } : {}),
    ...(systemSubType !== undefined ? { systemSubType } : {}),
    ...(systemTypeNo !== undefined ? { systemTypeNo } : {}),
    ...(serviceType !== undefined ? { serviceType } : {}),
    ...(institute !== undefined ? { institute } : {}),
    ...(location !== undefined ? { location } : {}),
    ...(ownerId !== undefined ? { ownerId } : {}),
    ...(associateId !== undefined ? { associateId } : {}),
    ...(associateCcIds !== undefined ? { associateCcIds: csv(associateCcIds) } : {}),
    ...(reviewSchedule !== undefined ? { reviewSchedule } : {}),
    ...(reviewDays !== undefined ? { reviewDays: csv(reviewDays) } : {}),
    ...(reviewDuration !== undefined ? { reviewDuration } : {}),
    ...(isExternal !== undefined ? { isExternal: !!isExternal } : {}),
    ...(organizationName !== undefined ? { organizationName } : {}),
    ...(providerName !== undefined ? { providerName } : {}),
    ...(externalPersonRole !== undefined ? { externalPersonRole } : {}),
    ...(externalPhoneNo !== undefined ? { externalPhoneNo } : {}),
    ...(supportingPerson !== undefined ? { supportingPerson } : {}),
    ...(fileGroupId !== undefined ? { fileGroupId } : {}),
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
  if (status === "verify_in_process") updates.submittedForVerificationAt = new Date();
  if (status === "in_progress") updates.startedAt = new Date();

  const [ticket] = await db.update(ticketsTable).set(updates).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "status_change", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { status } });
  if (ticket.createdById !== authUser.userId) {
    await createNotification({ userId: ticket.createdById, type: "ticket_status_changed", message: `Ticket ${ticket.ticketNo} status changed to ${status}`, entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo });
  }
  res.json(await enrichTicket(ticket));
});

router.post("/tickets/:id/acknowledge", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { remarks } = req.body;
  const [ticket] = await db.update(ticketsTable).set({ status: "in_progress", startedAt: new Date(), remarks: remarks ?? null }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (remarks) await db.insert(ticketCommentsTable).values({ ticketId: id, authorId: authUser.userId, content: remarks });
  await createAuditLog({ action: "acknowledge", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { remarks } });
  res.json(await enrichTicket(ticket));
});

router.post("/tickets/:id/reject", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { remarks } = req.body;
  if (!remarks) { res.status(400).json({ error: "Reject comments are required" }); return; }
  const [ticket] = await db.update(ticketsTable).set({ status: "rejected", remarks }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  await db.insert(ticketCommentsTable).values({ ticketId: id, authorId: authUser.userId, content: remarks });
  await createAuditLog({ action: "reject", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { remarks } });
  if (ticket.createdById !== authUser.userId) {
    await createNotification({ userId: ticket.createdById, type: "ticket_rejected", message: `Ticket ${ticket.ticketNo} was rejected`, entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo });
  }
  res.json(await enrichTicket(ticket));
});

router.patch("/tickets/:id/assign", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { assignedToId, remarks } = req.body;
  if (!assignedToId) { res.status(400).json({ error: "assignedToId required" }); return; }
  const allowed = await canAssignTicket(authUser.userId, Number(assignedToId));
  if (!allowed.ok) { res.status(403).json({ error: allowed.message ?? "Assignment is not allowed by hierarchy" }); return; }
  const [ticket] = await db.update(ticketsTable).set({ assignedToId, assignedById: authUser.userId, assignedAt: new Date(), assignedDepartmentId: null, status: "assigned", remarks: remarks ?? null }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  await addAssignmentEvent({ ticketId: ticket.id, assignedToId: Number(assignedToId), assignedById: authUser.userId, status: "assigned", remarks });
  await createAuditLog({ action: "assign", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { assignedToId } });
  await createNotification({ userId: assignedToId, type: "ticket_assigned", message: `Ticket ${ticket.ticketNo} has been assigned to you`, entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo });
  res.json(await enrichTicket(ticket));
});

router.patch("/tickets/:id/reassign", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { assignedToId, remarks } = req.body;
  if (!assignedToId) { res.status(400).json({ error: "assignedToId required" }); return; }
  const allowed = await canAssignTicket(authUser.userId, Number(assignedToId));
  if (!allowed.ok) { res.status(403).json({ error: allowed.message ?? "Assignment is not allowed by hierarchy" }); return; }
  const [previous] = await db.select().from(ticketAssignmentsTable).where(eq(ticketAssignmentsTable.ticketId, id)).orderBy(sql`${ticketAssignmentsTable.id} desc`).limit(1);
  const [ticket] = await db.update(ticketsTable).set({ assignedToId, assignedById: authUser.userId, assignedAt: new Date(), assignedDepartmentId: null, status: "assigned", remarks: remarks ?? null }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  await addAssignmentEvent({ ticketId: ticket.id, assignedToId: Number(assignedToId), assignedById: authUser.userId, status: "reassigned", remarks, previousAssignmentId: previous?.id ?? null, reopenCount: ticket.reopenCount });
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
  const authUser = (req as any).user;
  const [ticket] = await db.update(ticketsTable).set({
    assignedDepartmentId: Number(departmentId),
    assignedToId,
    assignedById: authUser.userId,
    assignedAt: assignedToId ? new Date() : null,
    status: "forwarded",
    remarks: remarks ?? null,
  }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (assignedToId) {
    await addAssignmentEvent({ ticketId: ticket.id, assignedToId, assignedById: authUser.userId, status: "forwarded", remarks });
  }
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

router.get("/tickets/:id/assignments", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const assignments = await db.select().from(ticketAssignmentsTable).where(eq(ticketAssignmentsTable.ticketId, id)).orderBy(sql`${ticketAssignmentsTable.assignedAt} desc`);
  const userIds = [...new Set(assignments.flatMap(a => [a.assignedToId, a.assignedById].filter((value): value is number => typeof value === "number")))];
  const users = userIds.length > 0 ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(userIds.map(uid => sql`${uid}`), sql`, `)}]::int[])`) : [];
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(assignments.map(a => ({
    id: a.id,
    ticketId: a.ticketId,
    assignedToId: a.assignedToId,
    assignedToName: userMap.get(a.assignedToId)?.name ?? null,
    assignedById: a.assignedById ?? null,
    assignedByName: a.assignedById ? userMap.get(a.assignedById)?.name ?? null : null,
    assignedAt: a.assignedAt.toISOString(),
    startedAt: a.startedAt?.toISOString() ?? null,
    endedAt: a.endedAt?.toISOString() ?? null,
    status: a.status,
    remarks: a.remarks ?? null,
    reopenCount: a.reopenCount,
    assetNo: a.assetNo ?? null,
    assetType: a.assetType ?? null,
    classificationType: a.classificationType ?? null,
    classificationCategory: a.classificationCategory ?? null,
    classificationIssue: a.classificationIssue ?? null,
  })));
});

router.post("/tickets/:id/reopen", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { remarks, assignedToId } = req.body;
  if (!remarks) { res.status(400).json({ error: "Remarks required" }); return; }
  const [current] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  if (!current) { res.status(404).json({ error: "Ticket not found" }); return; }
  const nextReopenCount = (current.reopenCount ?? 0) + 1;
  const targetAssignee = assignedToId ?? current.assignedToId;
  const [ticket] = await db.update(ticketsTable).set({
    status: "reopened",
    reopenCount: nextReopenCount,
    reopenedAt: new Date(),
    reopenRemarks: remarks,
    assignedToId: targetAssignee ?? null,
    assignedById: authUser.userId,
    assignedAt: targetAssignee ? new Date() : current.assignedAt,
    resolvedAt: null,
    closedAt: null,
  }).where(eq(ticketsTable.id, id)).returning();
  if (targetAssignee) {
    await addAssignmentEvent({ ticketId: ticket.id, assignedToId: Number(targetAssignee), assignedById: authUser.userId, status: "reopened", remarks, reopenCount: nextReopenCount });
  }
  await createAuditLog({ action: "reopen", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { remarks, reopenCount: nextReopenCount } });
  res.json(await enrichTicket(ticket));
});

router.post("/tickets/:id/verify", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { approved = true, remarks } = req.body;
  const status = approved ? "closed" : "reopened";
  const [ticket] = await db.update(ticketsTable).set({
    status,
    verifiedAt: new Date(),
    verifiedById: authUser.userId,
    verificationRemarks: remarks ?? null,
    closedAt: approved ? new Date() : null,
    reopenedAt: approved ? null : new Date(),
    reopenRemarks: approved ? null : remarks ?? "Rejected during verification",
    reopenCount: approved ? sql`${ticketsTable.reopenCount}` : sql`${ticketsTable.reopenCount} + 1`,
  }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  await createAuditLog({ action: approved ? "verify_close" : "verify_reject", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { approved, remarks } });
  res.json(await enrichTicket(ticket));
});

router.post("/tickets/:id/comments", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { content, hoursWorked } = req.body;
  if (!content) { res.status(400).json({ error: "Content required" }); return; }
  const [comment] = await db.insert(ticketCommentsTable).values({ ticketId: id, content, authorId: authUser.userId }).returning();
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  const parsedHours = Number(hoursWorked);
  if (Number.isFinite(parsedHours) && parsedHours > 0) {
    const today = new Date().toISOString().slice(0, 10);
    await db.insert(timesheetsTable).values({
      userId: authUser.userId,
      date: today,
      hoursWorked: parsedHours,
      ticketId: id,
      projectId: ticket?.projectId ?? null,
      taskDescription: content,
    });
  }
  await createAuditLog({ action: "comment", entityType: "ticket", entityId: id, entityRef: ticket?.ticketNo, userId: authUser.userId, newValue: { content, hoursWorked: Number.isFinite(parsedHours) ? parsedHours : undefined } });
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

async function getNextRoutineNo(): Promise<string> {
  const [latest] = await db.select().from(ticketRoutineTable).orderBy(sql`${ticketRoutineTable.id} desc`).limit(1);
  if (latest) {
    const num = parseInt(latest.routineNo.replace("RTN-", ""), 10);
    if (!Number.isNaN(num)) return `RTN-${num + 1}`;
  }
  return "RTN-1001";
}

async function enrichRoutine(routine: any) {
  let departmentName: string | null = null;
  let raisedByName: string | null = null;
  let categoryName: string | null = null;
  if (routine.departmentId) {
    const [department] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, routine.departmentId)).limit(1);
    departmentName = department?.name ?? null;
  }
  if (routine.raisedById) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, routine.raisedById)).limit(1);
    raisedByName = user?.name ?? null;
  }
  if (routine.categoryId) {
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, routine.categoryId)).limit(1);
    categoryName = category?.name ?? null;
  }
  const members = await db.select().from(ticketRoutineUsersTable).where(eq(ticketRoutineUsersTable.routineId, routine.id));
  return {
    id: routine.id,
    routineNo: routine.routineNo,
    subject: routine.subject,
    description: routine.description ?? null,
    status: routine.status,
    priority: routine.priority,
    categoryId: routine.categoryId ?? null,
    categoryName,
    type: routine.type,
    schedule: routine.schedule,
    departmentId: routine.departmentId ?? null,
    departmentName,
    raisedById: routine.raisedById ?? null,
    raisedByName,
    startDate: routine.startDate?.toISOString() ?? null,
    closingDate: routine.closingDate?.toISOString() ?? null,
    assignToIds: members.filter(member => member.assignCategory === "to").map(member => member.userId),
    assignCcIds: members.filter(member => member.assignCategory === "cc").map(member => member.userId),
    createdAt: routine.createdAt.toISOString(),
    updatedAt: routine.updatedAt.toISOString(),
  };
}

router.get("/ticket-routines", authMiddleware, async (_req, res): Promise<void> => {
  const routines = await db.select().from(ticketRoutineTable).orderBy(sql`${ticketRoutineTable.createdAt} desc`);
  res.json(await Promise.all(routines.map(enrichRoutine)));
});

router.post("/ticket-routines", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { subject, description, priority, categoryId, type, schedule, departmentId, startDate, closingDate, assignToIds = [], assignCcIds = [], days = [] } = req.body;
  if (!subject || !priority || !schedule) { res.status(400).json({ error: "Subject, priority and schedule required" }); return; }
  const routineNo = await getNextRoutineNo();
  const [routine] = await db.insert(ticketRoutineTable).values({
    routineNo,
    subject,
    description: description ?? null,
    priority,
    categoryId: categoryId ?? null,
    type: type ?? "routine",
    schedule,
    departmentId: departmentId ?? null,
    startDate: startDate ? new Date(startDate) : null,
    closingDate: closingDate ? new Date(closingDate) : null,
    raisedById: authUser.userId,
  }).returning();

  const memberRows = [
    ...assignToIds.map((userId: number | string) => ({ routineId: routine.id, userId: Number(userId), assignedById: authUser.userId, assignCategory: "to" })),
    ...assignCcIds.map((userId: number | string) => ({ routineId: routine.id, userId: Number(userId), assignedById: authUser.userId, assignCategory: "cc" })),
  ].filter(row => Number.isFinite(row.userId));
  const members = memberRows.length ? await db.insert(ticketRoutineUsersTable).values(memberRows).returning() : [];
  const dayRows = members.flatMap(member => days.map((dayValue: number | string) => ({
    routineUserId: member.id,
    dayValue: Number(dayValue),
    dayType: schedule === "monthly" ? "month" : "week",
  }))).filter(row => Number.isFinite(row.dayValue));
  if (dayRows.length) await db.insert(ticketRoutineScheduleDaysTable).values(dayRows);

  await createAuditLog({ action: "create", entityType: "ticket_routine", entityId: routine.id, entityRef: routine.routineNo, userId: authUser.userId, newValue: { subject, schedule } });
  res.status(201).json(await enrichRoutine(routine));
});

router.patch("/ticket-routines/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { subject, description, priority, categoryId, type, schedule, departmentId, startDate, closingDate, status, assignToIds = [], assignCcIds = [], days = [] } = req.body;
  const [routine] = await db.update(ticketRoutineTable).set({
    ...(subject ? { subject } : {}),
    ...(description !== undefined ? { description: description || null } : {}),
    ...(priority ? { priority } : {}),
    ...(categoryId !== undefined ? { categoryId: categoryId ? Number(categoryId) : null } : {}),
    ...(type ? { type } : {}),
    ...(schedule ? { schedule } : {}),
    ...(departmentId !== undefined ? { departmentId: departmentId ? Number(departmentId) : null } : {}),
    ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
    ...(closingDate !== undefined ? { closingDate: closingDate ? new Date(closingDate) : null } : {}),
    ...(status ? { status } : {}),
  }).where(eq(ticketRoutineTable.id, id)).returning();
  if (!routine) { res.status(404).json({ error: "Routine not found" }); return; }

  if (Array.isArray(assignToIds) || Array.isArray(assignCcIds)) {
    await db.delete(ticketRoutineUsersTable).where(eq(ticketRoutineUsersTable.routineId, id));
    const memberRows = [
      ...assignToIds.map((userId: number | string) => ({ routineId: id, userId: Number(userId), assignedById: authUser.userId, assignCategory: "to" })),
      ...assignCcIds.map((userId: number | string) => ({ routineId: id, userId: Number(userId), assignedById: authUser.userId, assignCategory: "cc" })),
    ].filter(row => Number.isFinite(row.userId));
    const members = memberRows.length ? await db.insert(ticketRoutineUsersTable).values(memberRows).returning() : [];
    const dayRows = members.flatMap(member => days.map((dayValue: number | string) => ({ routineUserId: member.id, dayValue: Number(dayValue), dayType: schedule === "monthly" ? "month" : "week" }))).filter(row => Number.isFinite(row.dayValue));
    if (dayRows.length) await db.insert(ticketRoutineScheduleDaysTable).values(dayRows);
  }
  await createAuditLog({ action: "update", entityType: "ticket_routine", entityId: routine.id, entityRef: routine.routineNo, userId: authUser.userId });
  res.json(await enrichRoutine(routine));
});

router.delete("/ticket-routines/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const members = await db.select().from(ticketRoutineUsersTable).where(eq(ticketRoutineUsersTable.routineId, id));
  for (const member of members) {
    await db.delete(ticketRoutineScheduleDaysTable).where(eq(ticketRoutineScheduleDaysTable.routineUserId, member.id));
  }
  await db.delete(ticketRoutineUsersTable).where(eq(ticketRoutineUsersTable.routineId, id));
  await db.delete(ticketRoutineTable).where(eq(ticketRoutineTable.id, id));
  await createAuditLog({ action: "delete", entityType: "ticket_routine", entityId: id, userId: authUser.userId });
  res.sendStatus(204);
});

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
