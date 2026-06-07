import { Router } from "express";
import { db, ticketsTable, projectsTable, todosTable, usersTable, notificationsTable, auditLogsTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/dashboard/stats", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;

  const allTickets = await db.select().from(ticketsTable);
  const myTickets = allTickets.filter(t => t.createdById === authUser.userId || t.assignedToId === authUser.userId);

  const total = myTickets.length;
  const open = myTickets.filter(t => t.status === "open" || t.status === "yts").length;
  const pending = myTickets.filter(t => t.status === "pending").length;
  const inProgress = myTickets.filter(t => t.status === "in_progress").length;
  const completed = myTickets.filter(t => t.status === "completed").length;
  const closed = myTickets.filter(t => t.status === "closed").length;
  const slaBreaches = myTickets.filter(t => t.slaBreached).length;

  const allProjects = await db.select().from(projectsTable);
  const myProjects = allProjects.filter(p => p.ownerId === authUser.userId || p.processOwnerId === authUser.userId);
  const projectsAssigned = myProjects.length;
  const projectsCompleted = myProjects.filter(p => p.status === "completed").length;

  const todos = await db.select().from(todosTable).where(eq(todosTable.createdById, authUser.userId));
  const myTodos = todos.filter(t => t.status !== "completed").length;

  const totalIncoming = allTickets.length;
  const teamTickets = allTickets.length;
  const teamProjects = allProjects.length;

  res.json({
    totalTickets: total,
    openTickets: open,
    pendingTickets: pending,
    inProgressTickets: inProgress,
    completedTickets: completed,
    closedTickets: closed,
    projectsAssigned,
    projectsCompleted,
    myTodos,
    slaBreaches,
    escalations: 0,
    pendingApprovals: 0,
    totalIncoming,
    teamTickets,
    teamProjects,
  });
});

router.get("/dashboard/team-stats", authMiddleware, async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).where(eq(usersTable.status, "active"));
  const tickets = await db.select().from(ticketsTable);
  const projects = await db.select().from(projectsTable);

  const stats = users.slice(0, 10).map(u => {
    const ut = tickets.filter(t => t.assignedToId === u.id || t.createdById === u.id);
    const up = projects.filter(p => p.ownerId === u.id);
    return {
      userId: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl ?? null,
      totalTickets: ut.length,
      openTickets: ut.filter(t => t.status === "open" || t.status === "yts").length,
      pendingTickets: ut.filter(t => t.status === "pending").length,
      inProgressTickets: ut.filter(t => t.status === "in_progress").length,
      completedTickets: ut.filter(t => t.status === "completed").length,
      closedTickets: ut.filter(t => t.status === "closed").length,
      projectsAssigned: up.length,
      projectsCompleted: up.filter(p => p.status === "completed").length,
    };
  });

  res.json(stats);
});

router.get("/dashboard/recent-activity", authMiddleware, async (req, res): Promise<void> => {
  const logs = await db
    .select()
    .from(auditLogsTable)
    .orderBy(sql`${auditLogsTable.createdAt} desc`)
    .limit(20);

  const userIds = [...new Set(logs.map(l => l.userId))];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
    : [];
  const userMap = new Map(users.map(u => [u.id, u.name]));

  const activities = logs.map(l => ({
    id: l.id,
    type: l.action,
    message: `${userMap.get(l.userId) ?? "User"} ${l.action} ${l.entityType} ${l.entityRef ?? ""}`.trim(),
    entityType: l.entityType ?? null,
    entityId: l.entityId ?? null,
    entityRef: l.entityRef ?? null,
    userId: l.userId ?? null,
    userName: userMap.get(l.userId) ?? null,
    createdAt: l.createdAt.toISOString(),
  }));

  res.json(activities);
});

export default router;
