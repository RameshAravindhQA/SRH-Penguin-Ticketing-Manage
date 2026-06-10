import { Router } from "express";
import { q, qRaw, inList } from "@workspace/db";
import { authMiddleware } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";
import { deleteEntityReminder, upsertEntityReminder } from "../lib/googleIntegration";

const router = Router();
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

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
  const [creator] = await q`SELECT TOP 1 * FROM users WHERE id = ${creatorId}`;
  const [assignee] = await q`SELECT TOP 1 * FROM users WHERE id = ${assignedToId}`;
  if (!creator || !assignee) return { ok: false, message: "Creator or assignee not found" };
  const creatorRank = hierarchyRank(creator);
  const assigneeRank = hierarchyRank(assignee);
  if (creatorRank >= 5) return { ok: true };
  if (assigneeRank > creatorRank) return { ok: false, message: "Cannot assign a ticket to a higher hierarchy user" };
  if (creatorRank >= 3) return { ok: true };
  if ((assignee as any).reportingManagerId === creatorId) return { ok: true };
  return { ok: false, message: "You can assign tickets only to yourself or users in your reporting tree" };
}

async function getNextTicketNo(): Promise<string> {
  const [latest] = await q<{ ticketNo: string }>`SELECT TOP 1 ticket_no AS ticketNo FROM tickets ORDER BY id DESC`;
  if (latest) {
    const num = parseInt(latest.ticketNo.replace("TKT-", ""), 10);
    return `TKT-${num + 1}`;
  }
  return `TKT-1001`;
}

function iso(value: any): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
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
    const [u] = await q<{ name: string; avatarUrl: string | null }>`SELECT TOP 1 name, avatar_url AS avatarUrl FROM users WHERE id = ${t.assignedToId}`;
    assignedToName = u?.name ?? null;
    assignedToAvatar = u?.avatarUrl ?? null;
  }
  if (t.assignedDepartmentId) {
    const [d] = await q<{ name: string }>`SELECT TOP 1 name FROM departments WHERE id = ${t.assignedDepartmentId}`;
    assignedDepartmentName = d?.name ?? null;
  }
  if (t.createdById) {
    const [u] = await q<{ name: string }>`SELECT TOP 1 name FROM users WHERE id = ${t.createdById}`;
    createdByName = u?.name ?? null;
  }
  if (t.projectId) {
    const [p] = await q<{ title: string }>`SELECT TOP 1 title FROM projects WHERE id = ${t.projectId}`;
    projectName = p?.title ?? null;
  }
  if (t.categoryId) {
    const [c] = await q<{ name: string }>`SELECT TOP 1 name FROM categories WHERE id = ${t.categoryId}`;
    category = c?.name ?? null;
  }
  if (t.subCategoryId) {
    const [s] = await q<{ name: string }>`SELECT TOP 1 name FROM sub_categories WHERE id = ${t.subCategoryId}`;
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
    assignedAt: iso(t.assignedAt),
    startedAt: iso(t.startedAt),
    dueDate: iso(t.dueDate),
    expectedCloseDate: iso(t.expectedCloseDate),
    resolvedAt: iso(t.resolvedAt),
    closedAt: iso(t.closedAt),
    submittedForVerificationAt: iso(t.submittedForVerificationAt),
    verifiedAt: iso(t.verifiedAt),
    verifiedById: t.verifiedById ?? null,
    verificationRemarks: t.verificationRemarks ?? null,
    cancelledAt: iso(t.cancelledAt),
    cancelledById: t.cancelledById ?? null,
    reopenCount: t.reopenCount ?? 0,
    reopenedAt: iso(t.reopenedAt),
    reopenRemarks: t.reopenRemarks ?? null,
    reviewSchedule: t.reviewSchedule ?? null,
    reviewDays: t.reviewDays ?? null,
    reviewDuration: t.reviewDuration ?? null,
    isExternal: !!t.isExternal,
    organizationName: t.organizationName ?? null,
    providerName: t.providerName ?? null,
    externalPersonRole: t.externalPersonRole ?? null,
    externalPhoneNo: t.externalPhoneNo ?? null,
    supportingPerson: t.supportingPerson ?? null,
    fileGroupId: t.fileGroupId ?? null,
    pendingDays,
    slaBreached: !!t.slaBreached,
    createdAt: iso(t.createdAt),
    updatedAt: iso(t.updatedAt),
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
  const [assignment] = await q`
    INSERT INTO ticket_assignments (ticket_id, assigned_to_id, assigned_by_id, status, remarks, previous_assignment_id, reopen_count, assigned_at)
    OUTPUT INSERTED.*
    VALUES (${input.ticketId}, ${input.assignedToId}, ${input.assignedById ?? null}, ${input.status ?? "assigned"},
            ${input.remarks ?? null}, ${input.previousAssignmentId ?? null}, ${input.reopenCount ?? 0}, SYSDATETIMEOFFSET())`;
  return assignment;
}

function csv(value: unknown): string | null {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(",");
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function notifyTicketStakeholders(opts: {
  ticketId: number;
  actorUserId: number;
  type: string;
  message: string;
}): Promise<void> {
  const [ticket] = await q<any>`SELECT TOP 1 * FROM tickets WHERE id = ${opts.ticketId}`;
  if (!ticket) return;
  const recipientIds = new Set<number>();
  if (ticket.createdById) recipientIds.add(ticket.createdById);
  if (ticket.assignedToId) recipientIds.add(ticket.assignedToId);
  if (ticket.ownerId) recipientIds.add(ticket.ownerId);
  if (ticket.associateId) recipientIds.add(ticket.associateId);
  for (const id of String(ticket.associateCcIds ?? "").split(",").map(Number).filter(Number.isFinite)) recipientIds.add(id);
  recipientIds.delete(opts.actorUserId);
  for (const userId of recipientIds) {
    await createNotification({ userId, type: opts.type, message: opts.message, entityType: "ticket", entityId: opts.ticketId, entityRef: ticket.ticketNo });
  }
}

router.get("/tickets", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { status, priority, search, myTickets } = req.query as Record<string, string>;
  let tickets = await q`SELECT * FROM tickets ORDER BY created_at DESC`;

  if (myTickets === "true") {
    tickets = (tickets as any[]).filter((t: any) => t.assignedToId === authUser.userId || t.createdById === authUser.userId);
  }
  if (status) tickets = (tickets as any[]).filter((t: any) => t.status === status);
  if (priority) tickets = (tickets as any[]).filter((t: any) => t.priority === priority);
  if (search) {
    const s = search.toLowerCase();
    tickets = (tickets as any[]).filter((t: any) => t.subject.toLowerCase().includes(s) || t.ticketNo.toLowerCase().includes(s));
  }

  const result = await Promise.all((tickets as any[]).map(enrichTicket));
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
  const status = assignedToId ? "open" : "yts";
  const [ticket] = await q`
    INSERT INTO tickets (ticket_no, subject, description, priority, category_id, sub_category_id, type, created_by_id,
      assigned_to_id, assigned_by_id, assigned_at, project_id, due_date, expected_close_date, source_department,
      system_type, system_sub_type, system_type_no, service_type, institute, location, owner_id, associate_id,
      associate_cc_ids, review_schedule, review_days, review_duration, is_external, organization_name, provider_name,
      external_person_role, external_phone_no, supporting_person, file_group_id, status, created_at, updated_at)
    OUTPUT INSERTED.*
    VALUES (${ticketNo}, ${subject}, ${description ?? null}, ${priority}, ${categoryId ?? null}, ${subCategoryId ?? null},
      ${type}, ${authUser.userId}, ${assignedToId ?? null}, ${assignedToId ? authUser.userId : null},
      ${assignedToId ? new Date() : null}, ${projectId ?? null}, ${dueDate ? new Date(dueDate) : null},
      ${expectedCloseDate ? new Date(expectedCloseDate) : null}, ${sourceDepartment ?? null}, ${systemType ?? null},
      ${systemSubType ?? null}, ${systemTypeNo ?? null}, ${serviceType ?? null}, ${institute ?? null}, ${location ?? null},
      ${ownerId ?? null}, ${associateId ?? null}, ${csv(associateCcIds)}, ${reviewSchedule ?? null}, ${csv(reviewDays)},
      ${reviewDuration ?? null}, ${!!isExternal}, ${organizationName ?? null}, ${providerName ?? null},
      ${externalPersonRole ?? null}, ${externalPhoneNo ?? null}, ${supportingPerson ?? null}, ${fileGroupId ?? null},
      ${status}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;

  if (assignedToId) {
    await addAssignmentEvent({ ticketId: (ticket as any).id, assignedToId: Number(assignedToId), assignedById: authUser.userId, status: "assigned" });
  }

  await createAuditLog({ action: "create", entityType: "ticket", entityId: (ticket as any).id, entityRef: (ticket as any).ticketNo, userId: authUser.userId, newValue: { subject } });

  if (assignedToId && assignedToId !== authUser.userId) {
    await createNotification({ userId: assignedToId, type: "ticket_assigned", message: `New ticket ${ticketNo} has been assigned to you`, entityType: "ticket", entityId: (ticket as any).id, entityRef: ticketNo });
  }
  if (assignedToId && (dueDate || expectedCloseDate)) {
    const deadline = new Date(dueDate ?? expectedCloseDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    await createNotification({ userId: Number(assignedToId), type: "ticket_due_date", message: `Ticket ${ticketNo} is due by ${deadline}`, entityType: "ticket", entityId: (ticket as any).id, entityRef: ticketNo });
  }
  await upsertEntityReminder({
    userId: assignedToId ? Number(assignedToId) : authUser.userId,
    title: `Ticket: ${ticketNo} - ${subject}`,
    description,
    startDate: dueDate ?? expectedCloseDate ?? null,
    endDate: expectedCloseDate ?? null,
    type: "ticket",
    entityType: "ticket",
    entityId: (ticket as any).id,
    attendeeIds: [authUser.userId, assignedToId, ownerId, associateId, ...(Array.isArray(associateCcIds) ? associateCcIds : [])].filter(Boolean).map(Number),
    createMeet: true,
  });

  res.status(201).json(await enrichTicket(ticket));
});

router.get("/tickets/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [ticket] = await q`SELECT TOP 1 * FROM tickets WHERE id = ${id}`;
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
  const sets: string[] = ["updated_at = SYSDATETIMEOFFSET()"];
  const params: Record<string, any> = { id };
  if (subject) { sets.push("subject = @subject"); params.subject = subject; }
  if (description != null) { sets.push("description = @description"); params.description = description; }
  if (priority) { sets.push("priority = @priority"); params.priority = priority; }
  if (categoryId != null) { sets.push("category_id = @categoryId"); params.categoryId = categoryId; }
  if (subCategoryId != null) { sets.push("sub_category_id = @subCategoryId"); params.subCategoryId = subCategoryId; }
  if (dueDate !== undefined) { sets.push("due_date = @dueDate"); params.dueDate = dueDate ? new Date(dueDate) : null; }
  if (expectedCloseDate !== undefined) { sets.push("expected_close_date = @expectedCloseDate"); params.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null; }
  if (sourceDepartment !== undefined) { sets.push("source_department = @sourceDepartment"); params.sourceDepartment = sourceDepartment; }
  if (systemType !== undefined) { sets.push("system_type = @systemType"); params.systemType = systemType; }
  if (systemSubType !== undefined) { sets.push("system_sub_type = @systemSubType"); params.systemSubType = systemSubType; }
  if (systemTypeNo !== undefined) { sets.push("system_type_no = @systemTypeNo"); params.systemTypeNo = systemTypeNo; }
  if (serviceType !== undefined) { sets.push("service_type = @serviceType"); params.serviceType = serviceType; }
  if (institute !== undefined) { sets.push("institute = @institute"); params.institute = institute; }
  if (location !== undefined) { sets.push("location = @location"); params.location = location; }
  if (ownerId !== undefined) { sets.push("owner_id = @ownerId"); params.ownerId = ownerId; }
  if (associateId !== undefined) { sets.push("associate_id = @associateId"); params.associateId = associateId; }
  if (associateCcIds !== undefined) { sets.push("associate_cc_ids = @associateCcIds"); params.associateCcIds = csv(associateCcIds); }
  if (reviewSchedule !== undefined) { sets.push("review_schedule = @reviewSchedule"); params.reviewSchedule = reviewSchedule; }
  if (reviewDays !== undefined) { sets.push("review_days = @reviewDays"); params.reviewDays = csv(reviewDays); }
  if (reviewDuration !== undefined) { sets.push("review_duration = @reviewDuration"); params.reviewDuration = reviewDuration; }
  if (isExternal !== undefined) { sets.push("is_external = @isExternal"); params.isExternal = !!isExternal; }
  if (organizationName !== undefined) { sets.push("organization_name = @organizationName"); params.organizationName = organizationName; }
  if (providerName !== undefined) { sets.push("provider_name = @providerName"); params.providerName = providerName; }
  if (externalPersonRole !== undefined) { sets.push("external_person_role = @externalPersonRole"); params.externalPersonRole = externalPersonRole; }
  if (externalPhoneNo !== undefined) { sets.push("external_phone_no = @externalPhoneNo"); params.externalPhoneNo = externalPhoneNo; }
  if (supportingPerson !== undefined) { sets.push("supporting_person = @supportingPerson"); params.supportingPerson = supportingPerson; }
  if (fileGroupId !== undefined) { sets.push("file_group_id = @fileGroupId"); params.fileGroupId = fileGroupId; }
  const [ticket] = await qRaw(`UPDATE tickets SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id`, params);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "update", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId });
  if ((dueDate !== undefined || expectedCloseDate !== undefined) && (ticket as any).assignedToId && ((ticket as any).dueDate || (ticket as any).expectedCloseDate)) {
    const deadline = new Date((ticket as any).dueDate ?? (ticket as any).expectedCloseDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    await createNotification({ userId: Number((ticket as any).assignedToId), type: "ticket_due_date", message: `Ticket ${(ticket as any).ticketNo} deadline changed to ${deadline}`, entityType: "ticket", entityId: (ticket as any).id, entityRef: (ticket as any).ticketNo });
  }
  await upsertEntityReminder({
    userId: (ticket as any).assignedToId ?? authUser.userId,
    title: `Ticket: ${(ticket as any).ticketNo} - ${(ticket as any).subject}`,
    description: (ticket as any).description ?? null,
    startDate: (ticket as any).dueDate ?? (ticket as any).expectedCloseDate ?? null,
    endDate: (ticket as any).expectedCloseDate ?? null,
    type: "ticket",
    entityType: "ticket",
    entityId: (ticket as any).id,
    attendeeIds: [
      (ticket as any).createdById,
      (ticket as any).assignedToId,
      (ticket as any).ownerId,
      (ticket as any).associateId,
      ...String((ticket as any).associateCcIds ?? "").split(",").map(Number).filter(Number.isFinite),
    ].filter(Boolean).map(Number),
    createMeet: true,
  });
  res.json(await enrichTicket(ticket));
});

router.delete("/tickets/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await q`DELETE FROM tickets WHERE id = ${id}`;
  await deleteEntityReminder("ticket", id);
  const authUser = (req as any).user;
  await createAuditLog({ action: "delete", entityType: "ticket", entityId: id, userId: authUser.userId });
  res.sendStatus(204);
});

router.patch("/tickets/:id/status", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status, remarks } = req.body;
  if (!status) { res.status(400).json({ error: "Status required" }); return; }

  const sets: string[] = ["status = @status", "remarks = @remarks", "updated_at = SYSDATETIMEOFFSET()"];
  const params: Record<string, any> = { id, status, remarks: remarks ?? null };
  if (status === "completed") sets.push("resolved_at = SYSDATETIMEOFFSET()");
  if (status === "closed") sets.push("closed_at = SYSDATETIMEOFFSET()");
  if (status === "verify_in_process") sets.push("submitted_for_verification_at = SYSDATETIMEOFFSET()");
  if (status === "in_progress") sets.push("started_at = SYSDATETIMEOFFSET()");

  const [ticket] = await qRaw(`UPDATE tickets SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id`, params);
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
  const [ticket] = await q`
    UPDATE tickets SET status = 'in_progress', started_at = SYSDATETIMEOFFSET(), remarks = ${remarks ?? null}, updated_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = ${id}`;
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (remarks) await q`INSERT INTO ticket_comments (ticket_id, author_id, content, created_at) VALUES (${id}, ${authUser.userId}, ${remarks}, SYSDATETIMEOFFSET())`;
  await createAuditLog({ action: "acknowledge", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { remarks } });
  res.json(await enrichTicket(ticket));
});

router.post("/tickets/:id/reject", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { remarks } = req.body;
  if (!remarks) { res.status(400).json({ error: "Reject comments are required" }); return; }
  const [ticket] = await q`
    UPDATE tickets SET status = 'rejected', remarks = ${remarks}, updated_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = ${id}`;
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  await q`INSERT INTO ticket_comments (ticket_id, author_id, content, created_at) VALUES (${id}, ${authUser.userId}, ${remarks}, SYSDATETIMEOFFSET())`;
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
  const [ticket] = await q`
    UPDATE tickets SET assigned_to_id = ${assignedToId}, assigned_by_id = ${authUser.userId}, assigned_at = SYSDATETIMEOFFSET(),
      assigned_department_id = NULL, status = 'assigned', remarks = ${remarks ?? null}, updated_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = ${id}`;
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
  const [previous] = await q<{ id: number }>`SELECT TOP 1 id FROM ticket_assignments WHERE ticket_id = ${id} ORDER BY id DESC`;
  const [ticket] = await q`
    UPDATE tickets SET assigned_to_id = ${assignedToId}, assigned_by_id = ${authUser.userId}, assigned_at = SYSDATETIMEOFFSET(),
      assigned_department_id = NULL, status = 'assigned', remarks = ${remarks ?? null}, updated_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = ${id}`;
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
  const [department] = await q<{ id: number; name: string; headId: number | null }>`SELECT TOP 1 * FROM departments WHERE id = ${Number(departmentId)}`;
  if (!department) { res.status(404).json({ error: "Department not found" }); return; }
  const departmentUsers = await q<{ id: number }>`SELECT * FROM users WHERE department_id = ${Number(departmentId)}`;
  const assignedToId = department.headId ?? departmentUsers[0]?.id ?? null;
  const authUser = (req as any).user;
  const [ticket] = await q`
    UPDATE tickets SET assigned_department_id = ${Number(departmentId)}, assigned_to_id = ${assignedToId},
      assigned_by_id = ${authUser.userId}, assigned_at = ${assignedToId ? new Date() : null}, status = 'forwarded',
      remarks = ${remarks ?? null}, updated_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = ${id}`;
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
  const [ticket] = await q`
    UPDATE tickets SET assigned_to_id = ${forwardToId}, status = 'forwarded', remarks = ${remarks ?? null}, updated_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = ${id}`;
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "forward", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { forwardToId } });
  await createNotification({ userId: forwardToId, type: "ticket_forwarded", message: `Ticket ${ticket.ticketNo} has been forwarded to you`, entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo });
  res.json(await enrichTicket(ticket));
});

router.post("/tickets/:id/reopen", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { remarks, assignedToId } = req.body;
  if (!remarks) { res.status(400).json({ error: "Remarks required" }); return; }
  const [current] = await q<{ id: number; reopenCount: number; assignedToId: number | null; assignedAt: Date | null }>`SELECT TOP 1 * FROM tickets WHERE id = ${id}`;
  if (!current) { res.status(404).json({ error: "Ticket not found" }); return; }
  const nextReopenCount = (current.reopenCount ?? 0) + 1;
  const targetAssignee = assignedToId ?? current.assignedToId;
  const [ticket] = await q`
    UPDATE tickets SET status = 'reopened', reopen_count = ${nextReopenCount}, reopened_at = SYSDATETIMEOFFSET(),
      reopen_remarks = ${remarks}, assigned_to_id = ${targetAssignee ?? null}, assigned_by_id = ${authUser.userId},
      assigned_at = ${targetAssignee ? new Date() : current.assignedAt}, resolved_at = NULL, closed_at = NULL,
      updated_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = ${id}`;
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
  const [ticket] = await q`
    UPDATE tickets SET status = ${status}, verified_at = SYSDATETIMEOFFSET(), verified_by_id = ${authUser.userId},
      verification_remarks = ${remarks ?? null}, closed_at = ${approved ? new Date() : null},
      reopened_at = ${approved ? null : new Date()}, reopen_remarks = ${approved ? null : remarks ?? "Rejected during verification"},
      reopen_count = reopen_count + ${approved ? 0 : 1}, updated_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = ${id}`;
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  await createAuditLog({ action: approved ? "verify_close" : "verify_reject", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { approved, remarks } });
  res.json(await enrichTicket(ticket));
});

router.get("/tickets/:id/comments", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const comments = await q<{ id: number; content: string; authorId: number; createdAt: Date }>`SELECT * FROM ticket_comments WHERE ticket_id = ${id} ORDER BY created_at ASC`;
  const userIds = [...new Set(comments.map(c => c.authorId))];
  const users = userIds.length ? await qRaw<{ id: number; name: string; avatarUrl: string | null }>(`SELECT id, name, avatar_url AS avatarUrl FROM users WHERE id IN ${inList(userIds)}`) : [];
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(comments.map(c => {
    const u = userMap.get(c.authorId);
    return { id: c.id, content: c.content, authorId: c.authorId, authorName: u?.name ?? null, authorAvatar: u?.avatarUrl ?? null, createdAt: iso(c.createdAt) };
  }));
});

router.get("/tickets/:id/assignments", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const assignments = await q<any>`SELECT * FROM ticket_assignments WHERE ticket_id = ${id} ORDER BY assigned_at DESC`;
  const userIds = [...new Set(assignments.flatMap((a: any) => [a.assignedToId, a.assignedById].filter((value): value is number => typeof value === "number")))];
  const users = userIds.length ? await qRaw<{ id: number; name: string }>(`SELECT id, name FROM users WHERE id IN ${inList(userIds)}`) : [];
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(assignments.map((a: any) => ({
    id: a.id,
    ticketId: a.ticketId,
    assignedToId: a.assignedToId,
    assignedToName: userMap.get(a.assignedToId)?.name ?? null,
    assignedById: a.assignedById ?? null,
    assignedByName: a.assignedById ? userMap.get(a.assignedById)?.name ?? null : null,
    assignedAt: iso(a.assignedAt),
    startedAt: iso(a.startedAt),
    endedAt: iso(a.endedAt),
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

router.post("/tickets/:id/comments", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { content, hoursWorked } = req.body;
  if (!content) { res.status(400).json({ error: "Content required" }); return; }
  const [comment] = await q`INSERT INTO ticket_comments (ticket_id, content, author_id, created_at) OUTPUT INSERTED.* VALUES (${id}, ${content}, ${authUser.userId}, SYSDATETIMEOFFSET())`;
  const [ticket] = await q<{ ticketNo: string; projectId: number | null }>`SELECT TOP 1 ticket_no AS ticketNo, project_id AS projectId FROM tickets WHERE id = ${id}`;
  const parsedHours = Number(hoursWorked);
  if (Number.isFinite(parsedHours) && parsedHours > 0) {
    await q`
      INSERT INTO timesheets (user_id, date, hours_worked, ticket_id, project_id, task_description, created_at)
      VALUES (${authUser.userId}, CONVERT(date, SYSDATETIMEOFFSET()), ${parsedHours}, ${id}, ${ticket?.projectId ?? null}, ${content}, SYSDATETIMEOFFSET())`;
  }
  await createAuditLog({ action: "comment", entityType: "ticket", entityId: id, entityRef: ticket?.ticketNo, userId: authUser.userId, newValue: { content, hoursWorked: Number.isFinite(parsedHours) ? parsedHours : undefined } });
  if (ticket) {
    await notifyTicketStakeholders({
      ticketId: id,
      actorUserId: authUser.userId,
      type: "ticket_note",
      message: `A note was added to ticket ${ticket.ticketNo}`,
    });
  }
  const [u] = await q<{ name: string; avatarUrl: string | null }>`SELECT TOP 1 name, avatar_url AS avatarUrl FROM users WHERE id = ${authUser.userId}`;
  res.status(201).json({ id: (comment as any).id, content: (comment as any).content, authorId: (comment as any).authorId, authorName: u?.name ?? null, authorAvatar: u?.avatarUrl ?? null, createdAt: iso((comment as any).createdAt) });
});

router.get("/tickets/:id/attachments", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const attachments = await q<any>`SELECT id, ticket_id AS ticketId, file_name AS fileName, mime_type AS mimeType, size_bytes AS sizeBytes, uploaded_by_id AS uploadedById, created_at AS createdAt FROM ticket_attachments WHERE ticket_id = ${id} ORDER BY created_at DESC`;
  res.json(attachments.map((a: any) => ({
    id: a.id,
    ticketId: a.ticketId,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    uploadedById: a.uploadedById,
    createdAt: iso(a.createdAt),
  })));
});

router.post("/tickets/:id/attachments", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { files } = req.body as { files?: Array<{ fileName: string; mimeType: string; sizeBytes: number; contentBase64: string }> };
  if (!Array.isArray(files) || files.length === 0) { res.status(400).json({ error: "At least one file is required" }); return; }
  if (files.some(file => !file.fileName || !file.mimeType || !file.contentBase64 || !file.sizeBytes)) { res.status(400).json({ error: "Invalid file payload" }); return; }
  if (files.some(file => file.sizeBytes > MAX_ATTACHMENT_BYTES)) { res.status(400).json({ error: "Each attachment must be 10 MB or smaller" }); return; }

  const [ticket] = await q<{ ticketNo: string }>`SELECT TOP 1 ticket_no AS ticketNo FROM tickets WHERE id = ${id}`;
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const inserted: any[] = [];
  for (const file of files) {
    const [row] = await q`
      INSERT INTO ticket_attachments (ticket_id, file_name, mime_type, size_bytes, content_base64, uploaded_by_id, created_at)
      OUTPUT INSERTED.*
      VALUES (${id}, ${file.fileName}, ${file.mimeType}, ${file.sizeBytes}, ${file.contentBase64}, ${authUser.userId}, SYSDATETIMEOFFSET())`;
    inserted.push(row);
  }
  await createAuditLog({ action: "attachment_upload", entityType: "ticket", entityId: id, entityRef: ticket.ticketNo, userId: authUser.userId, newValue: { count: inserted.length } });
  res.status(201).json(inserted.map(a => ({
    id: a.id,
    ticketId: a.ticketId,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    uploadedById: a.uploadedById,
    createdAt: iso(a.createdAt),
  })));
});

router.get("/tickets/:ticketId/attachments/:attachmentId/download", authMiddleware, async (req, res): Promise<void> => {
  const ticketId = parseInt(Array.isArray(req.params.ticketId) ? req.params.ticketId[0] : req.params.ticketId, 10);
  const attachmentId = parseInt(Array.isArray(req.params.attachmentId) ? req.params.attachmentId[0] : req.params.attachmentId, 10);
  const [attachment] = await q<{ fileName: string; mimeType: string; contentBase64: string }>`SELECT TOP 1 file_name AS fileName, mime_type AS mimeType, content_base64 AS contentBase64 FROM ticket_attachments WHERE id = ${attachmentId} AND ticket_id = ${ticketId}`;
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
  await q`DELETE FROM ticket_attachments WHERE id = ${attachmentId} AND ticket_id = ${ticketId}`;
  const authUser = (req as any).user;
  await createAuditLog({ action: "attachment_delete", entityType: "ticket", entityId: ticketId, userId: authUser.userId, newValue: { attachmentId } });
  res.sendStatus(204);
});

// ── Worklist / Routines ─────────────────────────────────────────────────────

async function getNextRoutineNo(): Promise<string> {
  const [latest] = await q<{ routineNo: string }>`SELECT TOP 1 routine_no AS routineNo FROM ticket_routines ORDER BY id DESC`;
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
    const [department] = await q<{ name: string }>`SELECT TOP 1 name FROM departments WHERE id = ${routine.departmentId}`;
    departmentName = department?.name ?? null;
  }
  if (routine.raisedById) {
    const [user] = await q<{ name: string }>`SELECT TOP 1 name FROM users WHERE id = ${routine.raisedById}`;
    raisedByName = user?.name ?? null;
  }
  if (routine.categoryId) {
    const [category] = await q<{ name: string }>`SELECT TOP 1 name FROM categories WHERE id = ${routine.categoryId}`;
    categoryName = category?.name ?? null;
  }
  const members = await q<{ id: number; userId: number; assignCategory: string }>`SELECT * FROM ticket_routine_users WHERE routine_id = ${routine.id}`;
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
    startDate: iso(routine.startDate),
    closingDate: iso(routine.closingDate),
    assignToIds: members.filter(member => member.assignCategory === "to").map(member => member.userId),
    assignCcIds: members.filter(member => member.assignCategory === "cc").map(member => member.userId),
    createdAt: iso(routine.createdAt),
    updatedAt: iso(routine.updatedAt),
  };
}

router.get("/ticket-routines", authMiddleware, async (_req, res): Promise<void> => {
  const routines = await q`SELECT * FROM ticket_routines ORDER BY created_at DESC`;
  res.json(await Promise.all((routines as any[]).map(enrichRoutine)));
});

router.post("/ticket-routines", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { subject, description, priority, categoryId, type, schedule, departmentId, startDate, closingDate, assignToIds = [], assignCcIds = [], days = [] } = req.body;
  if (!subject || !priority || !schedule) { res.status(400).json({ error: "Subject, priority and schedule required" }); return; }
  const routineNo = await getNextRoutineNo();
  const [routine] = await q`
    INSERT INTO ticket_routines (routine_no, subject, description, priority, category_id, type, schedule, department_id, start_date, closing_date, raised_by_id, created_at, updated_at)
    OUTPUT INSERTED.*
    VALUES (${routineNo}, ${subject}, ${description ?? null}, ${priority}, ${categoryId ?? null}, ${type ?? "routine"},
      ${schedule}, ${departmentId ?? null}, ${startDate ? new Date(startDate) : null}, ${closingDate ? new Date(closingDate) : null},
      ${authUser.userId}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;

  const memberRows = [
    ...assignToIds.map((userId: number | string) => ({ userId: Number(userId), assignCategory: "to" })),
    ...assignCcIds.map((userId: number | string) => ({ userId: Number(userId), assignCategory: "cc" })),
  ].filter(row => Number.isFinite(row.userId));
  const members: any[] = [];
  for (const row of memberRows) {
    const [member] = await q`
      INSERT INTO ticket_routine_users (routine_id, user_id, assigned_by_id, assign_category, assigned_at)
      OUTPUT INSERTED.*
      VALUES (${(routine as any).id}, ${row.userId}, ${authUser.userId}, ${row.assignCategory}, SYSDATETIMEOFFSET())`;
    members.push(member);
  }
  for (const member of members) {
    for (const dayValue of days) {
      const day = Number(dayValue);
      if (!Number.isFinite(day)) continue;
      await q`
        INSERT INTO ticket_routine_schedule_days (routine_user_id, day_value, day_type, created_at)
        VALUES (${member.id}, ${day}, ${schedule === "monthly" ? "month" : "week"}, SYSDATETIMEOFFSET())`;
    }
  }

  await createAuditLog({ action: "create", entityType: "ticket_routine", entityId: (routine as any).id, entityRef: (routine as any).routineNo, userId: authUser.userId, newValue: { subject, schedule } });
  res.status(201).json(await enrichRoutine(routine));
});

router.patch("/ticket-routines/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { subject, description, priority, categoryId, type, schedule, departmentId, startDate, closingDate, status, assignToIds, assignCcIds, days = [] } = req.body;

  const sets: string[] = ["updated_at = SYSDATETIMEOFFSET()"];
  const params: Record<string, any> = { id };
  if (subject) { sets.push("subject = @subject"); params.subject = subject; }
  if (description !== undefined) { sets.push("description = @description"); params.description = description || null; }
  if (priority) { sets.push("priority = @priority"); params.priority = priority; }
  if (categoryId !== undefined) { sets.push("category_id = @categoryId"); params.categoryId = categoryId ? Number(categoryId) : null; }
  if (type) { sets.push("type = @type"); params.type = type; }
  if (schedule) { sets.push("schedule = @schedule"); params.schedule = schedule; }
  if (departmentId !== undefined) { sets.push("department_id = @departmentId"); params.departmentId = departmentId ? Number(departmentId) : null; }
  if (startDate !== undefined) { sets.push("start_date = @startDate"); params.startDate = startDate ? new Date(startDate) : null; }
  if (closingDate !== undefined) { sets.push("closing_date = @closingDate"); params.closingDate = closingDate ? new Date(closingDate) : null; }
  if (status) { sets.push("status = @status"); params.status = status; }

  const [routine] = await qRaw(`UPDATE ticket_routines SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id`, params);
  if (!routine) { res.status(404).json({ error: "Routine not found" }); return; }

  if (Array.isArray(assignToIds) || Array.isArray(assignCcIds)) {
    await q`DELETE FROM ticket_routine_schedule_days WHERE routine_user_id IN (SELECT id FROM ticket_routine_users WHERE routine_id = ${id})`;
    await q`DELETE FROM ticket_routine_users WHERE routine_id = ${id}`;
    const memberRows = [
      ...(assignToIds ?? []).map((userId: number | string) => ({ userId: Number(userId), assignCategory: "to" })),
      ...(assignCcIds ?? []).map((userId: number | string) => ({ userId: Number(userId), assignCategory: "cc" })),
    ].filter(row => Number.isFinite(row.userId));
    const members: any[] = [];
    for (const row of memberRows) {
      const [member] = await q`
        INSERT INTO ticket_routine_users (routine_id, user_id, assigned_by_id, assign_category, assigned_at)
        OUTPUT INSERTED.*
        VALUES (${id}, ${row.userId}, ${authUser.userId}, ${row.assignCategory}, SYSDATETIMEOFFSET())`;
      members.push(member);
    }
    const effectiveSchedule = schedule ?? routine.schedule;
    for (const member of members) {
      for (const dayValue of days) {
        const day = Number(dayValue);
        if (!Number.isFinite(day)) continue;
        await q`
          INSERT INTO ticket_routine_schedule_days (routine_user_id, day_value, day_type, created_at)
          VALUES (${member.id}, ${day}, ${effectiveSchedule === "monthly" ? "month" : "week"}, SYSDATETIMEOFFSET())`;
      }
    }
  }
  await createAuditLog({ action: "update", entityType: "ticket_routine", entityId: routine.id, entityRef: routine.routineNo, userId: authUser.userId });
  res.json(await enrichRoutine(routine));
});

router.delete("/ticket-routines/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  await q`DELETE FROM ticket_routine_schedule_days WHERE routine_user_id IN (SELECT id FROM ticket_routine_users WHERE routine_id = ${id})`;
  await q`DELETE FROM ticket_routine_users WHERE routine_id = ${id}`;
  await q`DELETE FROM ticket_routines WHERE id = ${id}`;
  await createAuditLog({ action: "delete", entityType: "ticket_routine", entityId: id, userId: authUser.userId });
  res.sendStatus(204);
});

router.get("/worklist", authMiddleware, async (req, res): Promise<void> => {
  const { priority, search } = req.query as Record<string, string>;
  let tickets = await q`SELECT * FROM tickets WHERE status = 'yts' ORDER BY created_at DESC`;
  if (priority) tickets = (tickets as any[]).filter((t: any) => t.priority === priority);
  if (search) {
    const s = search.toLowerCase();
    tickets = (tickets as any[]).filter((t: any) => t.subject.toLowerCase().includes(s) || t.ticketNo.toLowerCase().includes(s));
  }
  const result = await Promise.all((tickets as any[]).map(enrichTicket));
  res.json(result);
});

router.post("/worklist/:id/pick", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const [ticket] = await q`
    UPDATE tickets SET assigned_to_id = ${authUser.userId}, status = 'in_progress', updated_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = ${id}`;
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  await createAuditLog({ action: "pick", entityType: "ticket", entityId: ticket.id, entityRef: ticket.ticketNo, userId: authUser.userId });
  res.json(await enrichTicket(ticket));
});

export default router;
