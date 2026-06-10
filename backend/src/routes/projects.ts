import { Router } from "express";
import { q, qRaw, inList } from "@workspace/db";
import { authMiddleware } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";
import { deleteEntityReminder, upsertEntityReminder } from "../lib/googleIntegration";
import { DEFAULT_ROLE_PERMISSIONS, normalizeRole, resolvePermissions, PROJECT_ROLES, PROJECT_PERMISSIONS } from "../lib/projectPermissions";

const router = Router();

function paramId(value: string | string[]): number {
  return parseInt(Array.isArray(value) ? value[0] : value, 10);
}

function iso(value: any): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function notifyStakeholders(opts: {
  projectId: number; project: any; actorUserId: number; type: string; message: (actorName: string) => string;
}): Promise<void> {
  const [actor] = await q<{ name: string }>`SELECT TOP 1 name FROM users WHERE id = ${opts.actorUserId}`;
  const actorName = actor?.name ?? "Someone";
  const collabs = await q`SELECT user_id AS userId FROM project_collaborators WHERE project_id = ${opts.projectId}`;
  const recipientIds = new Set<number>();
  if (opts.project.ownerId) recipientIds.add(opts.project.ownerId);
  if (opts.project.processOwnerId) recipientIds.add(opts.project.processOwnerId);
  for (const c of collabs as any[]) recipientIds.add(c.userId);
  recipientIds.delete(opts.actorUserId);
  const message = opts.message(actorName);
  for (const uid of recipientIds) {
    await createNotification({ userId: uid, type: opts.type, message, entityType: "project", entityId: opts.projectId, entityRef: opts.project.projectNo });
  }
}

async function getNextProjectNo(): Promise<string> {
  const [latest] = await q<{ projectNo: string }>`SELECT TOP 1 project_no AS projectNo FROM projects ORDER BY id DESC`;
  if (latest) {
    const num = parseInt(latest.projectNo.replace("PRJ-", ""), 10);
    return `PRJ-${num + 1}`;
  }
  return "PRJ-1001";
}

async function enrichProject(p: any) {
  const collabs = await q`SELECT * FROM project_collaborators WHERE project_id = ${p.id}`;
  const ids = [...new Set([...(collabs as any[]).map((c: any) => c.userId), p.ownerId, p.processOwnerId].filter(Boolean))] as number[];
  const users = ids.length ? await qRaw(`SELECT id, name, avatar_url AS avatarUrl FROM users WHERE id IN ${inList(ids)}`) : [];
  const userMap = new Map((users as any[]).map((u: any) => [u.id, u]));
  const [subCat] = p.subCategoryId ? await q`SELECT TOP 1 name FROM sub_categories WHERE id = ${p.subCategoryId}` : [];
  return {
    id: p.id, projectNo: p.projectNo, title: p.title, description: p.description ?? null,
    status: p.status, priority: p.priority, category: p.category ?? null,
    subCategory: (subCat as any)?.name ?? null, subCategoryId: p.subCategoryId ?? null,
    type: p.type ?? null, progress: p.progress,
    ownerId: p.ownerId ?? null, ownerName: p.ownerId ? (userMap.get(p.ownerId) as any)?.name ?? null : null,
    processOwnerId: p.processOwnerId ?? null, processOwnerName: p.processOwnerId ? (userMap.get(p.processOwnerId) as any)?.name ?? null : null,
    collaborators: (collabs as any[]).map((c: any) => {
      const u = userMap.get(c.userId) as any;
      return {
        userId: c.userId, name: u?.name ?? "Unknown", avatarUrl: u?.avatarUrl ?? null,
        role: normalizeRole(c.role), permissions: resolvePermissions(c.role, c.permissions),
        addedById: c.addedById ?? null, addedAt: iso(c.addedAt), updatedAt: iso(c.updatedAt),
      };
    }),
    startDate: p.startDate ?? null, endDate: p.endDate ?? null,
    reviewFrequency: p.reviewFrequency ?? null, ticketCount: 0,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

router.get("/projects", authMiddleware, async (req, res): Promise<void> => {
  const { status, search, myProjects } = req.query as Record<string, string>;
  const authUser = (req as any).user;
  let projects = await q`SELECT * FROM projects ORDER BY created_at DESC`;
  if (myProjects === "true") {
    const myCollabs = await q`SELECT project_id FROM project_collaborators WHERE user_id = ${authUser.userId}`;
    const myCollabIds = new Set((myCollabs as any[]).map((c: any) => c.projectId));
    projects = (projects as any[]).filter((p: any) => p.ownerId === authUser.userId || p.processOwnerId === authUser.userId || myCollabIds.has(p.id));
  }
  if (status) projects = (projects as any[]).filter((p: any) => p.status === status);
  if (search) { const s = search.toLowerCase(); projects = (projects as any[]).filter((p: any) => p.title.toLowerCase().includes(s) || p.projectNo.toLowerCase().includes(s)); }
  res.json(await Promise.all((projects as any[]).map(enrichProject)));
});

router.post("/projects", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { title, description, priority, category, subCategoryId, type, ownerId, processOwnerId, startDate, endDate, reviewFrequency, sourceDepartment, serviceType, location, systemType, systemSubType, reviewSchedule, reviewDuration, organizationName, providerName, externalPersonRole, externalPhoneNo, supportingPerson } = req.body;
  if (!title || !priority) { res.status(400).json({ error: "Title and priority required" }); return; }
  const projectNo = await getNextProjectNo();
  const [project] = await q`
    INSERT INTO projects (project_no, title, description, priority, category, sub_category_id, type, owner_id, process_owner_id,
      start_date, end_date, review_frequency, source_department, service_type, location, system_type, system_sub_type,
      review_schedule, review_duration, organization_name, provider_name, external_person_role, external_phone_no,
      supporting_person, status, progress, is_external, created_at, updated_at)
    OUTPUT INSERTED.*
    VALUES (${projectNo}, ${title}, ${description ?? null}, ${priority}, ${category ?? null}, ${subCategoryId ?? null},
            ${type ?? null}, ${ownerId ?? authUser.userId}, ${processOwnerId ?? null}, ${startDate ?? null}, ${endDate ?? null},
            ${reviewFrequency ?? null}, ${sourceDepartment ?? null}, ${serviceType ?? null}, ${location ?? null},
            ${systemType ?? null}, ${systemSubType ?? null},
            ${reviewSchedule != null && reviewSchedule !== "" ? Number(reviewSchedule) : null},
            ${reviewDuration ?? null}, ${organizationName ?? null}, ${providerName ?? null},
            ${externalPersonRole ?? null}, ${externalPhoneNo ?? null}, ${supportingPerson ?? null},
            'created', 0, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  await createAuditLog({ action: "create", entityType: "project", entityId: (project as any).id, entityRef: (project as any).projectNo, userId: authUser.userId, newValue: { title } });
  await upsertEntityReminder({
    userId: ownerId ?? authUser.userId,
    title: `Project: ${projectNo} - ${title}`,
    description,
    startDate: startDate ?? endDate ?? null,
    endDate: endDate ?? null,
    type: "project",
    entityType: "project",
    entityId: (project as any).id,
    attendeeIds: [ownerId ?? authUser.userId, processOwnerId].filter(Boolean).map(Number),
    createMeet: true,
  });
  res.status(201).json(await enrichProject(project));
});

router.get("/projects/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const [project] = await q`SELECT TOP 1 * FROM projects WHERE id = ${id}`;
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(await enrichProject(project));
});

router.patch("/projects/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const { title, description, status, priority, subCategoryId, ownerId, processOwnerId, startDate, endDate,
    sourceDepartment, serviceType, location, systemType, systemSubType, reviewSchedule, reviewDuration,
    organizationName, providerName, externalPersonRole, externalPhoneNo, supportingPerson } = req.body;
  const sets: string[] = ["updated_at = SYSDATETIMEOFFSET()"];
  const params: Record<string, any> = { id };
  if (title) { sets.push("title = @title"); params.title = title; }
  if (description != null) { sets.push("description = @desc"); params.desc = description; }
  if (status) { sets.push("status = @status"); params.status = status; }
  if (priority) { sets.push("priority = @prio"); params.prio = priority; }
  if (subCategoryId != null) { sets.push("sub_category_id = @scid"); params.scid = subCategoryId; }
  if (ownerId != null) { sets.push("owner_id = @oid"); params.oid = ownerId; }
  if (processOwnerId != null) { sets.push("process_owner_id = @poid"); params.poid = processOwnerId; }
  if (startDate != null) { sets.push("start_date = @sd"); params.sd = startDate; }
  if (endDate != null) { sets.push("end_date = @ed"); params.ed = endDate; }
  if (reviewSchedule !== undefined) { sets.push("review_schedule = @rs"); params.rs = reviewSchedule ? Number(reviewSchedule) : null; }
  if (reviewDuration !== undefined) { sets.push("review_duration = @rd"); params.rd = reviewDuration; }
  const [project] = await qRaw(`UPDATE projects SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id`, params);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "update", entityType: "project", entityId: project.id, entityRef: project.projectNo, userId: authUser.userId });
  await upsertEntityReminder({
    userId: (project as any).ownerId ?? authUser.userId,
    title: `Project: ${(project as any).projectNo} - ${(project as any).title}`,
    description: (project as any).description ?? null,
    startDate: (project as any).startDate ?? (project as any).endDate ?? null,
    endDate: (project as any).endDate ?? null,
    type: "project",
    entityType: "project",
    entityId: (project as any).id,
    attendeeIds: [(project as any).ownerId, (project as any).processOwnerId].filter(Boolean).map(Number),
    createMeet: true,
  });
  res.json(await enrichProject(project));
});

router.delete("/projects/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  await q`DELETE FROM project_collaborators WHERE project_id = ${id}`;
  await q`DELETE FROM projects WHERE id = ${id}`;
  await deleteEntityReminder("project", id);
  const authUser = (req as any).user;
  await createAuditLog({ action: "delete", entityType: "project", entityId: id, userId: authUser.userId });
  res.sendStatus(204);
});

router.patch("/projects/:id/progress", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const { progress } = req.body;
  if (progress == null) { res.status(400).json({ error: "progress required" }); return; }
  const [project] = await q`UPDATE projects SET progress = ${progress}, updated_at = SYSDATETIMEOFFSET() OUTPUT INSERTED.* WHERE id = ${id}`;
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "progress_update", entityType: "project", entityId: (project as any).id, entityRef: (project as any).projectNo, userId: authUser.userId, newValue: { progress } });
  res.json(await enrichProject(project));
});

router.post("/projects/:id/collaborators", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const { userId, role, permissions } = req.body;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const authUser = (req as any).user;
  const normalizedRole = normalizeRole(role);
  const permsJson = Array.isArray(permissions)
    ? JSON.stringify(permissions.filter((p: string) => (PROJECT_PERMISSIONS as readonly string[]).includes(p)))
    : null;
  const [existing] = await q`SELECT TOP 1 * FROM project_collaborators WHERE project_id = ${id} AND user_id = ${userId}`;
  if (existing) {
    await q`UPDATE project_collaborators SET role = ${normalizedRole}, permissions = ${permsJson}, updated_at = SYSDATETIMEOFFSET() WHERE project_id = ${id} AND user_id = ${userId}`;
  } else {
    await q`INSERT INTO project_collaborators (project_id, user_id, role, permissions, added_by_id, added_at, updated_at) VALUES (${id}, ${userId}, ${normalizedRole}, ${permsJson}, ${authUser.userId}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  }
  const [project] = await q`SELECT TOP 1 * FROM projects WHERE id = ${id}`;
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  await createAuditLog({ action: "add_collaborator", entityType: "project", entityId: id, userId: authUser.userId, newValue: { userId, role: normalizedRole } });
  await createNotification({ userId, type: "project_added", message: `You have been added to project ${(project as any).projectNo}`, entityType: "project", entityId: id, entityRef: (project as any).projectNo });
  const [addedUser] = await q<{ name: string }>`SELECT TOP 1 name FROM users WHERE id = ${userId}`;
  await notifyStakeholders({
    projectId: id, project, actorUserId: authUser.userId, type: "project_collaborator_added",
    message: (actorName) => `${actorName} added ${addedUser?.name ?? "a new collaborator"} (${normalizedRole}) to project ${(project as any).projectNo}`,
  });
  res.status(201).json(await enrichProject(project));
});

router.patch("/projects/:id/collaborators/:userId", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const userId = paramId(req.params.userId);
  const { role, permissions } = req.body;
  const [existing] = await q`SELECT TOP 1 * FROM project_collaborators WHERE project_id = ${id} AND user_id = ${userId}`;
  if (!existing) { res.status(404).json({ error: "Collaborator not found" }); return; }
  const normalizedRole = role != null ? normalizeRole(role) : (existing as any).role;
  const permsJson = Array.isArray(permissions)
    ? JSON.stringify(permissions.filter((p: string) => (PROJECT_PERMISSIONS as readonly string[]).includes(p)))
    : (existing as any).permissions;
  await q`UPDATE project_collaborators SET role = ${normalizedRole}, permissions = ${permsJson}, updated_at = SYSDATETIMEOFFSET() WHERE project_id = ${id} AND user_id = ${userId}`;
  const [project] = await q`SELECT TOP 1 * FROM projects WHERE id = ${id}`;
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "update_collaborator", entityType: "project", entityId: id, userId: authUser.userId, newValue: { userId, role: normalizedRole, permissions: permsJson } });
  if (userId !== authUser.userId) {
    await createNotification({ userId, type: "project_role_updated", message: `Your role on project ${(project as any).projectNo} was updated to ${normalizedRole}`, entityType: "project", entityId: id, entityRef: (project as any).projectNo });
  }
  await notifyStakeholders({
    projectId: id, project, actorUserId: authUser.userId, type: "project_collaborator_updated",
    message: (actorName) => `${actorName} updated permissions/role for a collaborator on project ${(project as any).projectNo}`,
  });
  res.json(await enrichProject(project));
});

router.delete("/projects/:id/collaborators/:userId", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const userId = paramId(req.params.userId);
  await q`DELETE FROM project_collaborators WHERE project_id = ${id} AND user_id = ${userId}`;
  const [project] = await q`SELECT TOP 1 * FROM projects WHERE id = ${id}`;
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "remove_collaborator", entityType: "project", entityId: id, userId: authUser.userId, newValue: { userId } });
  if (userId !== authUser.userId) {
    await createNotification({ userId, type: "project_removed", message: `You were removed from project ${(project as any).projectNo}`, entityType: "project", entityId: id, entityRef: (project as any).projectNo });
  }
  await notifyStakeholders({
    projectId: id, project, actorUserId: authUser.userId, type: "project_collaborator_removed",
    message: (actorName) => `${actorName} removed a collaborator from project ${(project as any).projectNo}`,
  });
  res.json(await enrichProject(project));
});

router.get("/projects/:id/comments", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const comments = await q`SELECT * FROM project_comments WHERE project_id = ${id} ORDER BY created_at ASC`;
  const uids = [...new Set((comments as any[]).map((c: any) => c.authorId as number))];
  const users = uids.length ? await qRaw(`SELECT id, name, avatar_url AS avatarUrl FROM users WHERE id IN ${inList(uids)}`) : [];
  const uMap = new Map((users as any[]).map((u: any) => [u.id, u]));
  res.json((comments as any[]).map((c: any) => {
    const u = uMap.get(c.authorId) as any;
    return { id: c.id, content: c.content, authorId: c.authorId, authorName: u?.name ?? null, authorAvatar: u?.avatarUrl ?? null, createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt };
  }));
});

router.post("/projects/:id/comments", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const authUser = (req as any).user;
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "Content required" }); return; }
  const [comment] = await q`INSERT INTO project_comments (project_id, content, author_id, created_at) OUTPUT INSERTED.* VALUES (${id}, ${content}, ${authUser.userId}, SYSDATETIMEOFFSET())`;
  await createAuditLog({ action: "comment", entityType: "project", entityId: id, userId: authUser.userId, newValue: { content } });
  const [user] = await q<{ name: string; avatarUrl: string | null }>`SELECT TOP 1 name, avatar_url AS avatarUrl FROM users WHERE id = ${authUser.userId}`;
  const [project] = await q`SELECT TOP 1 * FROM projects WHERE id = ${id}`;
  if (project) {
    await notifyStakeholders({
      projectId: id, project, actorUserId: authUser.userId, type: "project_comment",
      message: (actorName) => `${actorName} commented on project ${(project as any).projectNo}`,
    });
  }
  res.status(201).json({ id: (comment as any).id, content: (comment as any).content, authorId: (comment as any).authorId, authorName: user?.name ?? null, authorAvatar: user?.avatarUrl ?? null, createdAt: (comment as any).createdAt instanceof Date ? (comment as any).createdAt.toISOString() : (comment as any).createdAt });
});

// ---- Workflow nodes ----

router.get("/projects/:id/workflow", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const nodes = await q`SELECT * FROM project_workflow_nodes WHERE project_id = ${id} ORDER BY sequence_order ASC, id ASC`;
  const ids = [...new Set((nodes as any[]).map((n: any) => n.assignedToId).filter(Boolean))] as number[];
  const users = ids.length ? await qRaw(`SELECT id, name, avatar_url AS avatarUrl FROM users WHERE id IN ${inList(ids)}`) : [];
  const uMap = new Map((users as any[]).map((u: any) => [u.id, u]));
  res.json((nodes as any[]).map((n: any) => ({
    id: n.id, name: n.name, nodeType: n.nodeType, sequenceOrder: n.sequenceOrder, description: n.description ?? null,
    status: n.status, assignedToId: n.assignedToId ?? null, assignedToName: n.assignedToId ? (uMap.get(n.assignedToId) as any)?.name ?? null : null,
    startedAt: iso(n.startedAt), completedAt: iso(n.completedAt), durationSeconds: n.durationSeconds ?? null, transitionSeconds: n.transitionSeconds ?? null,
    createdAt: iso(n.createdAt), updatedAt: iso(n.updatedAt),
  })));
});

router.post("/projects/:id/workflow", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const { name, nodeType, sequenceOrder, description, assignedToId } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [node] = await q`
    INSERT INTO project_workflow_nodes (project_id, name, node_type, sequence_order, description, status, assigned_to_id, created_at, updated_at)
    OUTPUT INSERTED.*
    VALUES (${id}, ${name}, ${nodeType ?? "task"}, ${sequenceOrder ?? 0}, ${description ?? null}, 'pending', ${assignedToId ?? null}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  const authUser = (req as any).user;
  await createAuditLog({ action: "add_workflow_node", entityType: "project", entityId: id, userId: authUser.userId, newValue: { name } });
  res.status(201).json({
    id: (node as any).id, name: (node as any).name, nodeType: (node as any).nodeType, sequenceOrder: (node as any).sequenceOrder,
    description: (node as any).description ?? null, status: (node as any).status, assignedToId: (node as any).assignedToId ?? null,
  });
});

router.patch("/projects/:id/workflow/:nodeId", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const nodeId = paramId(req.params.nodeId);
  const { name, nodeType, sequenceOrder, description, assignedToId, status } = req.body;
  const sets: string[] = ["updated_at = SYSDATETIMEOFFSET()"];
  const params: Record<string, any> = { id, nodeId };
  if (name != null) { sets.push("name = @name"); params.name = name; }
  if (nodeType != null) { sets.push("node_type = @nodeType"); params.nodeType = nodeType; }
  if (sequenceOrder != null) { sets.push("sequence_order = @seq"); params.seq = sequenceOrder; }
  if (description !== undefined) { sets.push("description = @desc"); params.desc = description; }
  if (assignedToId !== undefined) { sets.push("assigned_to_id = @assignedToId"); params.assignedToId = assignedToId; }
  if (status != null) { sets.push("status = @status"); params.status = status; }
  const [node] = await qRaw(`UPDATE project_workflow_nodes SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @nodeId AND project_id = @id`, params);
  if (!node) { res.status(404).json({ error: "Node not found" }); return; }
  res.json({
    id: node.id, name: node.name, nodeType: node.nodeType, sequenceOrder: node.sequenceOrder, description: node.description ?? null,
    status: node.status, assignedToId: node.assignedToId ?? null, startedAt: iso(node.startedAt), completedAt: iso(node.completedAt),
    durationSeconds: node.durationSeconds ?? null,
  });
});

router.delete("/projects/:id/workflow/:nodeId", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const nodeId = paramId(req.params.nodeId);
  await q`DELETE FROM project_node_activities WHERE node_id = ${nodeId} AND project_id = ${id}`;
  await q`DELETE FROM project_workflow_nodes WHERE id = ${nodeId} AND project_id = ${id}`;
  res.sendStatus(204);
});

router.post("/projects/:id/workflow/:nodeId/start", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const nodeId = paramId(req.params.nodeId);
  const authUser = (req as any).user;
  const [node] = await q`SELECT TOP 1 * FROM project_workflow_nodes WHERE id = ${nodeId} AND project_id = ${id}`;
  if (!node) { res.status(404).json({ error: "Node not found" }); return; }
  const [prev] = await q`SELECT TOP 1 * FROM project_workflow_nodes WHERE project_id = ${id} AND completed_at IS NOT NULL ORDER BY completed_at DESC`;
  const [updated] = await qRaw(`
    UPDATE project_workflow_nodes
    SET status = 'in_progress', started_at = SYSDATETIMEOFFSET(), assigned_to_id = COALESCE(assigned_to_id, @userId),
        transition_seconds = (SELECT DATEDIFF(SECOND, MAX(completed_at), SYSDATETIMEOFFSET()) FROM project_workflow_nodes WHERE project_id = @id AND completed_at IS NOT NULL),
        updated_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = @nodeId`, { id, nodeId, userId: authUser.userId });
  const transitionSeconds = (updated as any).transitionSeconds ?? null;
  await q`
    INSERT INTO project_node_activities (project_id, node_id, user_id, action, from_node_id, to_node_id, transition_seconds, occurred_at)
    VALUES (${id}, ${nodeId}, ${authUser.userId}, 'start', ${prev ? (prev as any).id : null}, ${nodeId}, ${transitionSeconds}, SYSDATETIMEOFFSET())`;
  await createAuditLog({ action: "start_node", entityType: "project", entityId: id, userId: authUser.userId, newValue: { nodeId } });
  const [startProject] = await q`SELECT TOP 1 * FROM projects WHERE id = ${id}`;
  if (startProject) {
    await notifyStakeholders({
      projectId: id, project: startProject, actorUserId: authUser.userId, type: "project_node_started",
      message: (actorName) => `${actorName} started "${(node as any).name}" on project ${(startProject as any).projectNo}`,
    });
  }
  res.json({
    id: (updated as any).id, status: (updated as any).status, startedAt: iso((updated as any).startedAt),
    transitionSeconds: (updated as any).transitionSeconds ?? null, assignedToId: (updated as any).assignedToId ?? null,
  });
});

router.post("/projects/:id/workflow/:nodeId/complete", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const nodeId = paramId(req.params.nodeId);
  const { remarks } = req.body;
  const authUser = (req as any).user;
  const [node] = await q`SELECT TOP 1 * FROM project_workflow_nodes WHERE id = ${nodeId} AND project_id = ${id}`;
  if (!node) { res.status(404).json({ error: "Node not found" }); return; }
  const [updated] = await qRaw(`
    UPDATE project_workflow_nodes
    SET status = 'completed', completed_at = SYSDATETIMEOFFSET(),
        duration_seconds = CASE WHEN started_at IS NOT NULL THEN DATEDIFF(SECOND, started_at, SYSDATETIMEOFFSET()) ELSE duration_seconds END,
        updated_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = @nodeId`, { nodeId });
  const durationSeconds = (updated as any).durationSeconds ?? null;
  await q`
    INSERT INTO project_node_activities (project_id, node_id, user_id, action, duration_seconds, remarks, occurred_at)
    VALUES (${id}, ${nodeId}, ${authUser.userId}, 'complete', ${durationSeconds}, ${remarks ?? null}, SYSDATETIMEOFFSET())`;
  await createAuditLog({ action: "complete_node", entityType: "project", entityId: id, userId: authUser.userId, newValue: { nodeId, durationSeconds } });
  const [completeProject] = await q`SELECT TOP 1 * FROM projects WHERE id = ${id}`;
  if (completeProject) {
    await notifyStakeholders({
      projectId: id, project: completeProject, actorUserId: authUser.userId, type: "project_node_completed",
      message: (actorName) => `${actorName} completed "${(node as any).name}" on project ${(completeProject as any).projectNo}`,
    });
  }
  res.json({ id: (updated as any).id, status: (updated as any).status, completedAt: iso((updated as any).completedAt), durationSeconds: (updated as any).durationSeconds ?? null });
});

// ---- Flags ----

router.get("/projects/:id/flags", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const flags = await q`SELECT * FROM project_flags WHERE project_id = ${id} ORDER BY created_at DESC`;
  const ids = [...new Set((flags as any[]).flatMap((f: any) => [f.raisedById, f.resolvedById]).filter(Boolean))] as number[];
  const users = ids.length ? await qRaw(`SELECT id, name, avatar_url AS avatarUrl FROM users WHERE id IN ${inList(ids)}`) : [];
  const uMap = new Map((users as any[]).map((u: any) => [u.id, u]));
  res.json((flags as any[]).map((f: any) => ({
    id: f.id, nodeId: f.nodeId ?? null, description: f.description, status: f.status,
    raisedById: f.raisedById, raisedByName: (uMap.get(f.raisedById) as any)?.name ?? null,
    resolvedById: f.resolvedById ?? null, resolvedByName: f.resolvedById ? (uMap.get(f.resolvedById) as any)?.name ?? null : null,
    resolvedAt: iso(f.resolvedAt), createdAt: iso(f.createdAt),
  })));
});

router.post("/projects/:id/flags", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const { nodeId, description } = req.body;
  if (!description) { res.status(400).json({ error: "description required" }); return; }
  const authUser = (req as any).user;
  const [flag] = await q`
    INSERT INTO project_flags (project_id, node_id, raised_by_id, description, status, created_at)
    OUTPUT INSERTED.* VALUES (${id}, ${nodeId ?? null}, ${authUser.userId}, ${description}, 'open', SYSDATETIMEOFFSET())`;
  if (nodeId) {
    await q`INSERT INTO project_node_activities (project_id, node_id, user_id, action, remarks, occurred_at) VALUES (${id}, ${nodeId}, ${authUser.userId}, 'flag', ${description}, SYSDATETIMEOFFSET())`;
  }
  await createAuditLog({ action: "raise_flag", entityType: "project", entityId: id, userId: authUser.userId, newValue: { description } });
  const [flagProject] = await q`SELECT TOP 1 * FROM projects WHERE id = ${id}`;
  if (flagProject) {
    await notifyStakeholders({
      projectId: id, project: flagProject, actorUserId: authUser.userId, type: "project_flag_raised",
      message: (actorName) => `${actorName} raised a flag on project ${(flagProject as any).projectNo}: ${description}`,
    });
  }
  res.status(201).json({
    id: (flag as any).id, nodeId: (flag as any).nodeId ?? null, description: (flag as any).description,
    status: (flag as any).status, raisedById: (flag as any).raisedById, createdAt: iso((flag as any).createdAt),
  });
});

router.patch("/projects/:id/flags/:flagId", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const flagId = paramId(req.params.flagId);
  const { status } = req.body;
  const authUser = (req as any).user;
  const [flag] = await q`
    UPDATE project_flags SET status = ${status ?? "resolved"}, resolved_by_id = ${authUser.userId}, resolved_at = SYSDATETIMEOFFSET()
    OUTPUT INSERTED.* WHERE id = ${flagId} AND project_id = ${id}`;
  if (!flag) { res.status(404).json({ error: "Flag not found" }); return; }
  await createAuditLog({ action: "resolve_flag", entityType: "project", entityId: id, userId: authUser.userId, newValue: { flagId, status: (flag as any).status } });
  const [resolveProject] = await q`SELECT TOP 1 * FROM projects WHERE id = ${id}`;
  if (resolveProject) {
    await notifyStakeholders({
      projectId: id, project: resolveProject, actorUserId: authUser.userId, type: "project_flag_resolved",
      message: (actorName) => `${actorName} marked a flag as ${(flag as any).status} on project ${(resolveProject as any).projectNo}`,
    });
  }
  res.json({ id: (flag as any).id, status: (flag as any).status, resolvedById: (flag as any).resolvedById ?? null, resolvedAt: iso((flag as any).resolvedAt) });
});

// ---- Approvals ----

router.get("/projects/:id/approvals", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const approvals = await q`SELECT * FROM project_approvals WHERE project_id = ${id} ORDER BY created_at DESC`;
  const ids = [...new Set((approvals as any[]).map((a: any) => a.approvedById).filter(Boolean))] as number[];
  const users = ids.length ? await qRaw(`SELECT id, name, avatar_url AS avatarUrl FROM users WHERE id IN ${inList(ids)}`) : [];
  const uMap = new Map((users as any[]).map((u: any) => [u.id, u]));
  res.json((approvals as any[]).map((a: any) => ({
    id: a.id, nodeId: a.nodeId ?? null, status: a.status, remarks: a.remarks ?? null,
    approvedById: a.approvedById, approvedByName: (uMap.get(a.approvedById) as any)?.name ?? null, createdAt: iso(a.createdAt),
  })));
});

router.post("/projects/:id/approvals", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const { nodeId, status, remarks } = req.body;
  if (!status) { res.status(400).json({ error: "status required" }); return; }
  const authUser = (req as any).user;
  const [approval] = await q`
    INSERT INTO project_approvals (project_id, node_id, approved_by_id, status, remarks, created_at)
    OUTPUT INSERTED.* VALUES (${id}, ${nodeId ?? null}, ${authUser.userId}, ${status}, ${remarks ?? null}, SYSDATETIMEOFFSET())`;
  if (nodeId) {
    await q`INSERT INTO project_node_activities (project_id, node_id, user_id, action, remarks, occurred_at) VALUES (${id}, ${nodeId}, ${authUser.userId}, 'approval', ${remarks ?? null}, SYSDATETIMEOFFSET())`;
  }
  await createAuditLog({ action: "approval", entityType: "project", entityId: id, userId: authUser.userId, newValue: { nodeId, status } });
  const [approvalProject] = await q`SELECT TOP 1 * FROM projects WHERE id = ${id}`;
  if (approvalProject) {
    await notifyStakeholders({
      projectId: id, project: approvalProject, actorUserId: authUser.userId, type: "project_approval",
      message: (actorName) => `${actorName} recorded an approval (${status}) on project ${(approvalProject as any).projectNo}`,
    });
  }
  res.status(201).json({
    id: (approval as any).id, nodeId: (approval as any).nodeId ?? null, status: (approval as any).status,
    remarks: (approval as any).remarks ?? null, approvedById: (approval as any).approvedById, createdAt: iso((approval as any).createdAt),
  });
});

// ---- Activity history ----

router.get("/projects/:id/activity", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const activities = await q`SELECT * FROM project_node_activities WHERE project_id = ${id} ORDER BY occurred_at DESC`;
  const nodes = await q`SELECT id, name FROM project_workflow_nodes WHERE project_id = ${id}`;
  const nodeMap = new Map((nodes as any[]).map((n: any) => [n.id, n.name]));
  const ids = [...new Set((activities as any[]).map((a: any) => a.userId).filter(Boolean))] as number[];
  const users = ids.length ? await qRaw(`SELECT id, name, avatar_url AS avatarUrl FROM users WHERE id IN ${inList(ids)}`) : [];
  const uMap = new Map((users as any[]).map((u: any) => [u.id, u]));
  res.json((activities as any[]).map((a: any) => ({
    id: a.id, nodeId: a.nodeId ?? null, nodeName: a.nodeId ? nodeMap.get(a.nodeId) ?? null : null,
    userId: a.userId, userName: (uMap.get(a.userId) as any)?.name ?? null, action: a.action,
    fromNodeId: a.fromNodeId ?? null, fromNodeName: a.fromNodeId ? nodeMap.get(a.fromNodeId) ?? null : null,
    toNodeId: a.toNodeId ?? null, toNodeName: a.toNodeId ? nodeMap.get(a.toNodeId) ?? null : null,
    durationSeconds: a.durationSeconds ?? null, transitionSeconds: a.transitionSeconds ?? null,
    remarks: a.remarks ?? null, occurredAt: iso(a.occurredAt),
  })));
});

router.get("/projects/:id/users/:userId/activity", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const userId = paramId(req.params.userId);
  const activities = await q`SELECT * FROM project_node_activities WHERE project_id = ${id} AND user_id = ${userId} ORDER BY occurred_at DESC`;
  const comments = await q`SELECT * FROM project_comments WHERE project_id = ${id} AND author_id = ${userId} ORDER BY created_at DESC`;
  const flags = await q`SELECT * FROM project_flags WHERE project_id = ${id} AND raised_by_id = ${userId} ORDER BY created_at DESC`;
  const approvals = await q`SELECT * FROM project_approvals WHERE project_id = ${id} AND approved_by_id = ${userId} ORDER BY created_at DESC`;
  const nodes = await q`SELECT id, name FROM project_workflow_nodes WHERE project_id = ${id}`;
  const nodeMap = new Map((nodes as any[]).map((n: any) => [n.id, n.name]));

  const totalSeconds = (activities as any[]).reduce((sum: number, a: any) => sum + (a.durationSeconds ?? 0), 0);
  const daysWorked = new Set<string>();
  for (const a of activities as any[]) daysWorked.add(new Date(a.occurredAt).toISOString().slice(0, 10));
  for (const c of comments as any[]) daysWorked.add(new Date(c.createdAt).toISOString().slice(0, 10));
  for (const f of flags as any[]) daysWorked.add(new Date(f.createdAt).toISOString().slice(0, 10));
  for (const ap of approvals as any[]) daysWorked.add(new Date(ap.createdAt).toISOString().slice(0, 10));

  const [user] = await q<{ name: string; avatarUrl: string | null }>`SELECT TOP 1 name, avatar_url AS avatarUrl FROM users WHERE id = ${userId}`;

  res.json({
    userId, userName: user?.name ?? null, avatarUrl: user?.avatarUrl ?? null,
    summary: {
      tasksWorked: (activities as any[]).filter((a: any) => a.action === "start" || a.action === "complete").length,
      commentsAdded: (comments as any[]).length,
      flagsRaised: (flags as any[]).length,
      approvalsPerformed: (approvals as any[]).length,
      daysWorked: daysWorked.size,
      totalHoursWorked: Math.round((totalSeconds / 3600) * 100) / 100,
    },
    activities: (activities as any[]).map((a: any) => ({
      id: a.id, nodeId: a.nodeId ?? null, nodeName: a.nodeId ? nodeMap.get(a.nodeId) ?? null : null, action: a.action,
      durationSeconds: a.durationSeconds ?? null, transitionSeconds: a.transitionSeconds ?? null, remarks: a.remarks ?? null, occurredAt: iso(a.occurredAt),
    })),
    comments: (comments as any[]).map((c: any) => ({ id: c.id, content: c.content, createdAt: iso(c.createdAt) })),
    flags: (flags as any[]).map((f: any) => ({ id: f.id, description: f.description, status: f.status, createdAt: iso(f.createdAt) })),
    approvals: (approvals as any[]).map((a: any) => ({ id: a.id, status: a.status, remarks: a.remarks ?? null, createdAt: iso(a.createdAt) })),
  });
});

// ---- Export data (for PDF generation on the frontend) ----

router.get("/projects/:id/export-data", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const [project] = await q`SELECT TOP 1 * FROM projects WHERE id = ${id}`;
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const enriched = await enrichProject(project);
  const nodes = await q`SELECT * FROM project_workflow_nodes WHERE project_id = ${id} ORDER BY sequence_order ASC, id ASC`;
  const activities = await q`SELECT * FROM project_node_activities WHERE project_id = ${id} ORDER BY occurred_at ASC`;
  const flags = await q`SELECT * FROM project_flags WHERE project_id = ${id} ORDER BY created_at ASC`;
  const approvals = await q`SELECT * FROM project_approvals WHERE project_id = ${id} ORDER BY created_at ASC`;
  const comments = await q`SELECT * FROM project_comments WHERE project_id = ${id} ORDER BY created_at ASC`;
  const auditLogs = await q`SELECT * FROM audit_logs WHERE entity_type = 'project' AND entity_id = ${id} ORDER BY created_at ASC`;

  const userIds = [...new Set([
    ...(nodes as any[]).map((n: any) => n.assignedToId),
    ...(activities as any[]).map((a: any) => a.userId),
    ...(flags as any[]).flatMap((f: any) => [f.raisedById, f.resolvedById]),
    ...(approvals as any[]).map((a: any) => a.approvedById),
    ...(comments as any[]).map((c: any) => c.authorId),
    ...(auditLogs as any[]).map((a: any) => a.userId),
  ].filter(Boolean))] as number[];
  const users = userIds.length ? await qRaw(`SELECT id, name, avatar_url AS avatarUrl FROM users WHERE id IN ${inList(userIds)}`) : [];
  const uMap = new Map((users as any[]).map((u: any) => [u.id, u]));
  const nodeMap = new Map((nodes as any[]).map((n: any) => [n.id, n.name]));

  const totalDuration = (nodes as any[]).reduce((sum: number, n: any) => sum + (n.durationSeconds ?? 0), 0);
  const totalTransition = (nodes as any[]).reduce((sum: number, n: any) => sum + (n.transitionSeconds ?? 0), 0);
  const completedNodes = (nodes as any[]).filter((n: any) => n.status === "completed").length;

  res.json({
    project: enriched,
    workflow: (nodes as any[]).map((n: any, idx: number) => ({
      id: n.id, name: n.name, nodeType: n.nodeType, sequenceOrder: n.sequenceOrder, status: n.status,
      isStart: idx === 0, isEnd: idx === (nodes as any[]).length - 1,
      assignedToId: n.assignedToId ?? null, assignedToName: n.assignedToId ? (uMap.get(n.assignedToId) as any)?.name ?? null : null,
      startedAt: iso(n.startedAt), completedAt: iso(n.completedAt),
      durationSeconds: n.durationSeconds ?? null, transitionSeconds: n.transitionSeconds ?? null,
    })),
    activities: (activities as any[]).map((a: any) => ({
      nodeName: a.nodeId ? nodeMap.get(a.nodeId) ?? null : null, userName: (uMap.get(a.userId) as any)?.name ?? null,
      action: a.action, fromNodeName: a.fromNodeId ? nodeMap.get(a.fromNodeId) ?? null : null, toNodeName: a.toNodeId ? nodeMap.get(a.toNodeId) ?? null : null,
      durationSeconds: a.durationSeconds ?? null, transitionSeconds: a.transitionSeconds ?? null, remarks: a.remarks ?? null, occurredAt: iso(a.occurredAt),
    })),
    flags: (flags as any[]).map((f: any) => ({
      nodeName: f.nodeId ? nodeMap.get(f.nodeId) ?? null : null, description: f.description, status: f.status,
      raisedByName: (uMap.get(f.raisedById) as any)?.name ?? null, resolvedByName: f.resolvedById ? (uMap.get(f.resolvedById) as any)?.name ?? null : null,
      createdAt: iso(f.createdAt), resolvedAt: iso(f.resolvedAt),
    })),
    approvals: (approvals as any[]).map((a: any) => ({
      nodeName: a.nodeId ? nodeMap.get(a.nodeId) ?? null : null, status: a.status, remarks: a.remarks ?? null,
      approvedByName: (uMap.get(a.approvedById) as any)?.name ?? null, createdAt: iso(a.createdAt),
    })),
    comments: (comments as any[]).map((c: any) => ({
      authorName: (uMap.get(c.authorId) as any)?.name ?? null, content: c.content, createdAt: iso(c.createdAt),
    })),
    auditLogs: (auditLogs as any[]).map((a: any) => ({
      action: a.action, userName: (uMap.get(a.userId) as any)?.name ?? null, entityRef: a.entityRef ?? null, createdAt: iso(a.createdAt),
    })),
    analytics: {
      totalNodes: (nodes as any[]).length, completedNodes,
      progressPercent: enriched.progress,
      totalDurationSeconds: totalDuration, totalTransitionSeconds: totalTransition,
      totalDurationHours: Math.round((totalDuration / 3600) * 100) / 100,
      flagsRaised: (flags as any[]).length, flagsResolved: (flags as any[]).filter((f: any) => f.status === "resolved").length,
      approvalsCount: (approvals as any[]).length, commentsCount: (comments as any[]).length,
    },
  });
});

router.get("/projects/:id/users/:userId/export-data", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const userId = paramId(req.params.userId);
  const [project] = await q`SELECT TOP 1 * FROM projects WHERE id = ${id}`;
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const activities = await q`SELECT * FROM project_node_activities WHERE project_id = ${id} AND user_id = ${userId} ORDER BY occurred_at ASC`;
  const comments = await q`SELECT * FROM project_comments WHERE project_id = ${id} AND author_id = ${userId} ORDER BY created_at ASC`;
  const flags = await q`SELECT * FROM project_flags WHERE project_id = ${id} AND raised_by_id = ${userId} ORDER BY created_at ASC`;
  const approvals = await q`SELECT * FROM project_approvals WHERE project_id = ${id} AND approved_by_id = ${userId} ORDER BY created_at ASC`;
  const nodes = await q`SELECT id, name FROM project_workflow_nodes WHERE project_id = ${id}`;
  const nodeMap = new Map((nodes as any[]).map((n: any) => [n.id, n.name]));
  const [user] = await q<{ name: string; avatarUrl: string | null; employeeCode: string | null }>`
    SELECT TOP 1 name, avatar_url AS avatarUrl, employee_code AS employeeCode FROM users WHERE id = ${userId}`;
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const totalSeconds = (activities as any[]).reduce((sum: number, a: any) => sum + (a.durationSeconds ?? 0), 0);
  const daysWorked = new Set<string>();
  for (const a of activities as any[]) daysWorked.add(new Date(a.occurredAt).toISOString().slice(0, 10));
  for (const c of comments as any[]) daysWorked.add(new Date(c.createdAt).toISOString().slice(0, 10));
  for (const f of flags as any[]) daysWorked.add(new Date(f.createdAt).toISOString().slice(0, 10));
  for (const ap of approvals as any[]) daysWorked.add(new Date(ap.createdAt).toISOString().slice(0, 10));

  res.json({
    project: { id: (project as any).id, projectNo: (project as any).projectNo, title: (project as any).title },
    user: { id: userId, name: user.name, employeeCode: user.employeeCode ?? null, avatarUrl: user.avatarUrl ?? null },
    summary: {
      tasksWorked: (activities as any[]).filter((a: any) => a.action === "start" || a.action === "complete").length,
      commentsAdded: (comments as any[]).length,
      flagsRaised: (flags as any[]).length,
      approvalsPerformed: (approvals as any[]).length,
      daysWorked: daysWorked.size,
      totalHoursWorked: Math.round((totalSeconds / 3600) * 100) / 100,
    },
    activities: (activities as any[]).map((a: any) => ({
      nodeName: a.nodeId ? nodeMap.get(a.nodeId) ?? null : null, action: a.action,
      durationSeconds: a.durationSeconds ?? null, transitionSeconds: a.transitionSeconds ?? null, remarks: a.remarks ?? null, occurredAt: iso(a.occurredAt),
    })),
    comments: (comments as any[]).map((c: any) => ({ content: c.content, createdAt: iso(c.createdAt) })),
    flags: (flags as any[]).map((f: any) => ({ description: f.description, status: f.status, createdAt: iso(f.createdAt) })),
    approvals: (approvals as any[]).map((a: any) => ({ status: a.status, remarks: a.remarks ?? null, createdAt: iso(a.createdAt) })),
  });
});

export default router;
