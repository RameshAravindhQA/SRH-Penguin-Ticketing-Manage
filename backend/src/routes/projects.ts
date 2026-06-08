import { Router } from "express";
import { db, projectsTable, projectCollaboratorsTable, projectCommentsTable, subCategoriesTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";

const router = Router();

async function getNextProjectNo(): Promise<string> {
  const [latest] = await db.select().from(projectsTable).orderBy(sql`${projectsTable.id} desc`).limit(1);
  if (latest) {
    const num = parseInt(latest.projectNo.replace("PRJ-", ""), 10);
    return `PRJ-${num + 1}`;
  }
  return `PRJ-1001`;
}

async function enrichProject(p: any) {
  const collabs = await db.select().from(projectCollaboratorsTable).where(eq(projectCollaboratorsTable.projectId, p.id));
  const userIds = [...new Set([...collabs.map(c => c.userId), p.ownerId, p.processOwnerId].filter(Boolean))] as number[];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));
  const [subCategory] = p.subCategoryId
    ? await db.select().from(subCategoriesTable).where(eq(subCategoriesTable.id, p.subCategoryId)).limit(1)
    : [];

  return {
    id: p.id,
    projectNo: p.projectNo,
    title: p.title,
    description: p.description ?? null,
    status: p.status,
    priority: p.priority,
    category: p.category ?? null,
    subCategory: subCategory?.name ?? null,
    subCategoryId: p.subCategoryId ?? null,
    type: p.type ?? null,
    progress: p.progress,
    ownerId: p.ownerId ?? null,
    ownerName: p.ownerId ? userMap.get(p.ownerId)?.name ?? null : null,
    processOwnerId: p.processOwnerId ?? null,
    processOwnerName: p.processOwnerId ? userMap.get(p.processOwnerId)?.name ?? null : null,
    collaborators: collabs.map(c => {
      const u = userMap.get(c.userId);
      return { userId: c.userId, name: u?.name ?? "Unknown", avatarUrl: u?.avatarUrl ?? null, role: c.role ?? null };
    }),
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
    reviewFrequency: p.reviewFrequency ?? null,
    ticketCount: 0,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/projects", authMiddleware, async (req, res): Promise<void> => {
  const { status, search, myProjects } = req.query as Record<string, string>;
  const authUser = (req as any).user;
  let projects = await db.select().from(projectsTable).orderBy(sql`${projectsTable.createdAt} desc`);
  if (myProjects === "true") {
    const myCollabs = await db.select().from(projectCollaboratorsTable).where(eq(projectCollaboratorsTable.userId, authUser.userId));
    const myCollabIds = new Set(myCollabs.map(c => c.projectId));
    projects = projects.filter(p => p.ownerId === authUser.userId || p.processOwnerId === authUser.userId || myCollabIds.has(p.id));
  }
  if (status) projects = projects.filter(p => p.status === status);
  if (search) {
    const s = search.toLowerCase();
    projects = projects.filter(p => p.title.toLowerCase().includes(s) || p.projectNo.toLowerCase().includes(s));
  }
  const result = await Promise.all(projects.map(enrichProject));
  res.json(result);
});

router.post("/projects", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { title, description, priority, category, subCategoryId, type, ownerId, processOwnerId, startDate, endDate, reviewFrequency, sourceDepartment, serviceType, location, systemType, systemSubType, reviewSchedule, reviewDuration, organizationName, providerName, externalPersonRole, externalPhoneNo, supportingPerson } = req.body;
  if (!title || !priority) { res.status(400).json({ error: "Title and priority required" }); return; }
  const projectNo = await getNextProjectNo();
  const [project] = await db.insert(projectsTable).values({
    projectNo, title,
    description: description ?? null,
    priority,
    category: category ?? null,
    subCategoryId: subCategoryId ?? null,
    type: type ?? null,
    ownerId: ownerId ?? authUser.userId,
    processOwnerId: processOwnerId ?? null,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    reviewFrequency: reviewFrequency ?? null,
    sourceDepartment: sourceDepartment ?? null,
    serviceType: serviceType ?? null,
    location: location ?? null,
    systemType: systemType ?? null,
    systemSubType: systemSubType ?? null,
    reviewSchedule: reviewSchedule != null && reviewSchedule !== "" ? Number(reviewSchedule) : null,
    reviewDuration: reviewDuration ?? null,
    organizationName: organizationName ?? null,
    providerName: providerName ?? null,
    externalPersonRole: externalPersonRole ?? null,
    externalPhoneNo: externalPhoneNo ?? null,
    supportingPerson: supportingPerson ?? null,
  }).returning();
  await createAuditLog({ action: "create", entityType: "project", entityId: project.id, entityRef: project.projectNo, userId: authUser.userId, newValue: { title } });
  res.status(201).json(await enrichProject(project));
});

router.get("/projects/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(await enrichProject(project));
});

router.patch("/projects/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { title, description, status, priority, subCategoryId, ownerId, processOwnerId, startDate, endDate, sourceDepartment, serviceType, location, systemType, systemSubType, reviewSchedule, reviewDuration, organizationName, providerName, externalPersonRole, externalPhoneNo, supportingPerson } = req.body;
  const [project] = await db.update(projectsTable).set({
    ...(title ? { title } : {}),
    ...(description != null ? { description } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(subCategoryId != null ? { subCategoryId } : {}),
    ...(ownerId != null ? { ownerId } : {}),
    ...(processOwnerId != null ? { processOwnerId } : {}),
    ...(startDate != null ? { startDate } : {}),
    ...(endDate != null ? { endDate } : {}),
    ...(sourceDepartment !== undefined ? { sourceDepartment } : {}),
    ...(serviceType !== undefined ? { serviceType } : {}),
    ...(location !== undefined ? { location } : {}),
    ...(systemType !== undefined ? { systemType } : {}),
    ...(systemSubType !== undefined ? { systemSubType } : {}),
    ...(reviewSchedule !== undefined ? { reviewSchedule: reviewSchedule ? Number(reviewSchedule) : null } : {}),
    ...(reviewDuration !== undefined ? { reviewDuration } : {}),
    ...(organizationName !== undefined ? { organizationName } : {}),
    ...(providerName !== undefined ? { providerName } : {}),
    ...(externalPersonRole !== undefined ? { externalPersonRole } : {}),
    ...(externalPhoneNo !== undefined ? { externalPhoneNo } : {}),
    ...(supportingPerson !== undefined ? { supportingPerson } : {}),
  }).where(eq(projectsTable.id, id)).returning();
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "update", entityType: "project", entityId: project.id, entityRef: project.projectNo, userId: authUser.userId });
  res.json(await enrichProject(project));
});

router.delete("/projects/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(projectCollaboratorsTable).where(eq(projectCollaboratorsTable.projectId, id));
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  const authUser = (req as any).user;
  await createAuditLog({ action: "delete", entityType: "project", entityId: id, userId: authUser.userId });
  res.sendStatus(204);
});

router.patch("/projects/:id/progress", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { progress } = req.body;
  if (progress == null) { res.status(400).json({ error: "progress required" }); return; }
  const [project] = await db.update(projectsTable).set({ progress }).where(eq(projectsTable.id, id)).returning();
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "progress_update", entityType: "project", entityId: project.id, entityRef: project.projectNo, userId: authUser.userId, newValue: { progress } });
  res.json(await enrichProject(project));
});

router.post("/projects/:id/collaborators", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { userId, role } = req.body;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  await db.insert(projectCollaboratorsTable).values({ projectId: id, userId, role: role ?? null });
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "add_collaborator", entityType: "project", entityId: id, userId: authUser.userId, newValue: { userId } });
  await createNotification({ userId, type: "project_added", message: `You have been added to project ${project.projectNo}`, entityType: "project", entityId: id, entityRef: project.projectNo });
  res.status(201).json(await enrichProject(project));
});

router.delete("/projects/:id/collaborators/:userId", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);
  await db.delete(projectCollaboratorsTable).where(eq(projectCollaboratorsTable.projectId, id));
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(await enrichProject(project));
});

router.get("/projects/:id/comments", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const comments = await db
    .select()
    .from(projectCommentsTable)
    .where(eq(projectCommentsTable.projectId, id))
    .orderBy(sql`${projectCommentsTable.createdAt} asc`);

  const userIds = [...new Set(comments.map(c => c.authorId))];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(userIds.map(uid => sql`${uid}`), sql`, `)}]::int[])`)
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  res.json(comments.map(c => {
    const user = userMap.get(c.authorId);
    return {
      id: c.id,
      content: c.content,
      authorId: c.authorId,
      authorName: user?.name ?? null,
      authorAvatar: user?.avatarUrl ?? null,
      createdAt: c.createdAt.toISOString(),
    };
  }));
});

router.post("/projects/:id/comments", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const authUser = (req as any).user;
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "Content required" }); return; }

  const [comment] = await db.insert(projectCommentsTable).values({
    projectId: id,
    content,
    authorId: authUser.userId,
  }).returning();

  await createAuditLog({ action: "comment", entityType: "project", entityId: id, userId: authUser.userId, newValue: { content } });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.userId)).limit(1);

  res.status(201).json({
    id: comment.id,
    content: comment.content,
    authorId: comment.authorId,
    authorName: user?.name ?? null,
    authorAvatar: user?.avatarUrl ?? null,
    createdAt: comment.createdAt.toISOString(),
  });
});

export default router;
