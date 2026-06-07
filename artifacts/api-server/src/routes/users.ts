import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, departmentsTable, rolesTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import { formatUser } from "./auth";

const router = Router();

async function enrichUser(u: any) {
  let deptName: string | null = null;
  let managerName: string | null = null;
  if (u.departmentId) {
    const [d] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, u.departmentId)).limit(1);
    deptName = d?.name ?? null;
  }
  if (u.reportingManagerId) {
    const [m] = await db.select().from(usersTable).where(eq(usersTable.id, u.reportingManagerId)).limit(1);
    managerName = m?.name ?? null;
  }
  return { ...formatUser(u, deptName), reportingManagerName: managerName };
}

router.get("/users", authMiddleware, async (req, res): Promise<void> => {
  let query = db.select().from(usersTable);
  const users = await query;
  const { department, role, status, search } = req.query as Record<string, string>;

  const filtered = users.filter(u => {
    if (status && u.status !== status) return false;
    if (role && u.role !== role) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!u.name.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s) && !u.employeeCode.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const result = await Promise.all(filtered.map(enrichUser));
  res.json(result);
});

router.post("/users", authMiddleware, async (req, res): Promise<void> => {
  const { employeeCode, name, email, mobile, departmentId, designation, role, roleId, reportingManagerId, password, status } = req.body;
  if (!employeeCode || !name || !email || !role) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const hash = await bcrypt.hash(password ?? "Password@123", 12);
  const [user] = await db.insert(usersTable).values({
    employeeCode,
    name,
    email,
    passwordHash: hash,
    mobile: mobile ?? null,
    departmentId: departmentId ?? null,
    designation: designation ?? null,
    role,
    roleId: roleId ?? null,
    reportingManagerId: reportingManagerId ?? null,
    status: status ?? "active",
  }).returning();
  const authUser = (req as any).user;
  await createAuditLog({ action: "create", entityType: "user", entityId: user.id, entityRef: user.employeeCode, userId: authUser.userId, newValue: { name, email } });
  res.status(201).json(await enrichUser(user));
});

router.get("/users/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(await enrichUser(user));
});

router.patch("/users/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, email, mobile, departmentId, designation, role, roleId, reportingManagerId, status } = req.body;
  const [user] = await db.update(usersTable).set({
    ...(name != null ? { name } : {}),
    ...(email != null ? { email } : {}),
    ...(mobile != null ? { mobile } : {}),
    ...(departmentId != null ? { departmentId } : {}),
    ...(designation != null ? { designation } : {}),
    ...(role != null ? { role } : {}),
    ...(roleId != null ? { roleId } : {}),
    ...(reportingManagerId != null ? { reportingManagerId } : {}),
    ...(status != null ? { status } : {}),
  }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "update", entityType: "user", entityId: user.id, userId: authUser.userId });
  res.json(await enrichUser(user));
});

router.delete("/users/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  const authUser = (req as any).user;
  await createAuditLog({ action: "delete", entityType: "user", entityId: id, userId: authUser.userId });
  res.sendStatus(204);
});

// ── Departments ──────────────────────────────────────────────────────────────

router.get("/departments", authMiddleware, async (req, res): Promise<void> => {
  const depts = await db.select().from(departmentsTable);
  const users = await db.select({ id: usersTable.id, departmentId: usersTable.departmentId }).from(usersTable);
  const result = depts.map(d => ({
    id: d.id,
    name: d.name,
    description: d.description ?? null,
    headId: d.headId ?? null,
    headName: null,
    userCount: users.filter(u => u.departmentId === d.id).length,
    createdAt: d.createdAt.toISOString(),
  }));
  res.json(result);
});

router.post("/departments", authMiddleware, async (req, res): Promise<void> => {
  const { name, description, headId } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [dept] = await db.insert(departmentsTable).values({ name, description: description ?? null, headId: headId ?? null }).returning();
  res.status(201).json({ id: dept.id, name: dept.name, description: dept.description ?? null, headId: dept.headId ?? null, headName: null, userCount: 0, createdAt: dept.createdAt.toISOString() });
});

router.patch("/departments/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, description, headId } = req.body;
  const [dept] = await db.update(departmentsTable).set({ ...(name ? { name } : {}), ...(description != null ? { description } : {}), ...(headId != null ? { headId } : {}) }).where(eq(departmentsTable.id, id)).returning();
  if (!dept) { res.status(404).json({ error: "Department not found" }); return; }
  res.json({ id: dept.id, name: dept.name, description: dept.description ?? null, headId: dept.headId ?? null, headName: null, userCount: 0, createdAt: dept.createdAt.toISOString() });
});

router.delete("/departments/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(departmentsTable).where(eq(departmentsTable.id, id));
  res.sendStatus(204);
});

// ── Roles ────────────────────────────────────────────────────────────────────

router.get("/roles", authMiddleware, async (req, res): Promise<void> => {
  const roles = await db.select().from(rolesTable);
  res.json(roles.map(r => ({ id: r.id, name: r.name, description: r.description ?? null, level: r.level, createdAt: r.createdAt.toISOString() })));
});

router.post("/roles", authMiddleware, async (req, res): Promise<void> => {
  const { name, description, level } = req.body;
  if (!name || level == null) { res.status(400).json({ error: "Name and level required" }); return; }
  const [role] = await db.insert(rolesTable).values({ name, description: description ?? null, level }).returning();
  res.status(201).json({ id: role.id, name: role.name, description: role.description ?? null, level: role.level, createdAt: role.createdAt.toISOString() });
});

router.patch("/roles/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, description, level } = req.body;
  const [role] = await db.update(rolesTable).set({ ...(name ? { name } : {}), ...(description != null ? { description } : {}), ...(level != null ? { level } : {}) }).where(eq(rolesTable.id, id)).returning();
  if (!role) { res.status(404).json({ error: "Role not found" }); return; }
  res.json({ id: role.id, name: role.name, description: role.description ?? null, level: role.level, createdAt: role.createdAt.toISOString() });
});

router.delete("/roles/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(rolesTable).where(eq(rolesTable.id, id));
  res.sendStatus(204);
});

// ── Categories ───────────────────────────────────────────────────────────────

export default router;
