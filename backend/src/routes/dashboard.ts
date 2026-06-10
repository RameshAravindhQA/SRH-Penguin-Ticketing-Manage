import { Router } from "express";
import { q, qRaw, inList } from "@workspace/db";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/dashboard/stats", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const allTickets = await q`SELECT * FROM tickets`;
  const myTickets = allTickets.filter((t: any) => t.createdById === authUser.userId || t.assignedToId === authUser.userId);
  const total = myTickets.length;
  const open = myTickets.filter((t: any) => t.status === "open" || t.status === "yts").length;
  const pending = myTickets.filter((t: any) => t.status === "pending").length;
  const inProgress = myTickets.filter((t: any) => t.status === "in_progress").length;
  const completed = myTickets.filter((t: any) => t.status === "completed").length;
  const closed = myTickets.filter((t: any) => t.status === "closed").length;
  const slaBreaches = myTickets.filter((t: any) => t.slaBreached).length;

  const allProjects = await q`SELECT * FROM projects`;
  const myProjects = allProjects.filter((p: any) => p.ownerId === authUser.userId || p.processOwnerId === authUser.userId);

  const todos = await q`SELECT * FROM todos WHERE created_by_id = ${authUser.userId}`;
  const myTodos = (todos as any[]).filter((t: any) => t.status !== "completed").length;

  res.json({
    totalTickets: total, openTickets: open, pendingTickets: pending, inProgressTickets: inProgress,
    completedTickets: completed, closedTickets: closed,
    projectsAssigned: myProjects.length, projectsCompleted: (myProjects as any[]).filter((p: any) => p.status === "completed").length,
    myTodos, slaBreaches, escalations: 0, pendingApprovals: 0,
    totalIncoming: allTickets.length, teamTickets: allTickets.length, teamProjects: allProjects.length,
  });
});

router.get("/dashboard/team-stats", authMiddleware, async (_req, res): Promise<void> => {
  const users = await q`SELECT TOP 10 * FROM users WHERE status = 'active'`;
  const tickets = await q`SELECT * FROM tickets`;
  const projects = await q`SELECT * FROM projects`;
  const stats = (users as any[]).map(u => {
    const ut = (tickets as any[]).filter(t => t.assignedToId === u.id || t.createdById === u.id);
    const up = (projects as any[]).filter(p => p.ownerId === u.id);
    return {
      userId: u.id, name: u.name, avatarUrl: u.avatarUrl ?? null,
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

router.get("/dashboard/recent-activity", authMiddleware, async (_req, res): Promise<void> => {
  const logs = await q`SELECT TOP 20 * FROM audit_logs ORDER BY created_at DESC`;
  const userIds = [...new Set((logs as any[]).map(l => l.userId as number))];
  const users = userIds.length ? await qRaw(`SELECT id, name FROM users WHERE id IN ${inList(userIds)}`) : [];
  const userMap = new Map((users as any[]).map(u => [u.id, u.name]));
  res.json((logs as any[]).map(l => ({
    id: l.id, type: l.action,
    message: `${userMap.get(l.userId) ?? "User"} ${l.action} ${l.entityType} ${l.entityRef ?? ""}`.trim(),
    entityType: l.entityType ?? null, entityId: l.entityId ?? null, entityRef: l.entityRef ?? null,
    userId: l.userId ?? null, userName: userMap.get(l.userId) ?? null,
    createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
  })));
});

export default router;
