import { Router } from "express";
import bcrypt from "bcryptjs";
import { q, qRaw } from "@workspace/db";
import type { User } from "@workspace/db";
import { authMiddleware } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import { formatUser } from "./auth";
import { defaultPermissionsForRole, ensureRolePermissionsColumn, normalizePermissions } from "../lib/rbac";

const router = Router();

function paramId(value: string | string[]): number {
  return parseInt(Array.isArray(value) ? value[0] : value, 10);
}

async function enrichUser(u: any) {
  let deptName: string | null = null;
  let managerName: string | null = null;
  if (u.departmentId) {
    const [d] = await q<{ name: string }>`SELECT TOP 1 name FROM departments WHERE id = ${u.departmentId}`;
    deptName = d?.name ?? null;
  }
  if (u.reportingManagerId) {
    const [m] = await q<{ name: string }>`SELECT TOP 1 name FROM users WHERE id = ${u.reportingManagerId}`;
    managerName = m?.name ?? null;
  }
  const permissions = normalizePermissions((u as any).permissions);
  return { ...formatUser(u, deptName, permissions), reportingManagerName: managerName };
}

router.get("/users", authMiddleware, async (req, res): Promise<void> => {
  const { status, role, search } = req.query as Record<string, string>;
  let users = await q<User>`SELECT * FROM users`;
  if (status) users = users.filter(u => u.status === status);
  if (role) users = users.filter(u => u.role === role);
  if (search) {
    const s = search.toLowerCase();
    users = users.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.employeeCode.toLowerCase().includes(s));
  }
  const result = await Promise.all(users.map(enrichUser));
  res.json(result);
});

router.get("/users/tree", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const users = await q<User>`SELECT * FROM users`;
  const current = users.find(u => u.id === authUser.userId);
  if (!current) { res.status(404).json({ error: "Current user not found" }); return; }

  const normalizedRole = current.role.toLowerCase().replace(/\s+/g, "_");
  const canSeeAll = ["admin", "administrator", "manager", "asst_manager", "assistant_manager"].includes(normalizedRole);
  const canSeeTree = canSeeAll || ["project_manager", "team_leader", "team_lead"].includes(normalizedRole);
  const allowedIds = new Set<number>();

  const collectReports = (managerId: number) => {
    for (const u of users.filter(u => u.reportingManagerId === managerId)) {
      if (!allowedIds.has(u.id)) { allowedIds.add(u.id); collectReports(u.id); }
    }
  };

  if (canSeeAll) users.forEach(u => allowedIds.add(u.id));
  else if (canSeeTree) { allowedIds.add(current.id); collectReports(current.id); }
  else allowedIds.add(current.id);

  const visible = users.filter(u => allowedIds.has(u.id));
  const enriched = await Promise.all(visible.map(enrichUser));
  const byManager = new Map<number | null, any[]>();
  enriched.forEach(u => {
    const mid = (u.reportingManagerId as number | null) ?? null;
    if (!byManager.has(mid)) byManager.set(mid, []);
    byManager.get(mid)!.push(u);
  });
  const makeNode = (u: any): any => ({ ...u, children: (byManager.get(u.id) ?? []).map(makeNode) });
  const roots = canSeeAll
    ? enriched.filter(u => !u.reportingManagerId || !allowedIds.has(u.reportingManagerId)).map(makeNode)
    : [makeNode(enriched.find(u => u.id === current.id) ?? enriched[0])].filter(Boolean);
  res.json({ role: current.role, canSeeAll, users: enriched, tree: roots });
});

router.post("/users", authMiddleware, async (req, res): Promise<void> => {
  const { employeeCode, name, email, mobile, departmentId, designation, role, roleId, reportingManagerId, password, status, avatarUrl, permissions } = req.body;
  if (!employeeCode || !name || !email || !role) { res.status(400).json({ error: "Missing required fields" }); return; }
  const hash = await bcrypt.hash(password ?? "Password@123", 12);
  const normalizedPermissions = normalizePermissions(permissions);
  const [user] = await q<User>`
    INSERT INTO users (employee_code, name, email, password_hash, mobile, department_id, designation, role, role_id,
      reporting_manager_id, permissions, avatar_url, status, is_hardware_user, is_call_center_user, created_at, updated_at)
    OUTPUT INSERTED.*
    VALUES (${employeeCode}, ${name}, ${email}, ${hash}, ${mobile ?? null}, ${departmentId ?? null},
            ${designation ?? null}, ${role}, ${roleId ?? null}, ${reportingManagerId ?? null},
            ${normalizedPermissions.length ? JSON.stringify(normalizedPermissions) : null}, ${avatarUrl ?? null}, ${status ?? "active"}, 0, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  const authUser = (req as any).user;
  await createAuditLog({ action: "create", entityType: "user", entityId: user.id, entityRef: user.employeeCode, userId: authUser.userId, newValue: { name, email } });
  res.status(201).json(await enrichUser(user));
});

router.get("/users/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const [user] = await q<User>`SELECT TOP 1 * FROM users WHERE id = ${id}`;
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(await enrichUser(user));
});

router.patch("/users/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const { name, email, mobile, departmentId, designation, role, roleId, reportingManagerId, status, avatarUrl, permissions } = req.body;
  const sets: string[] = [];
  const params: Record<string, any> = { id };
  if (name != null) { sets.push("name = @name"); params.name = name; }
  if (email != null) { sets.push("email = @email"); params.email = email; }
  if (mobile != null) { sets.push("mobile = @mobile"); params.mobile = mobile; }
  if (departmentId != null) { sets.push("department_id = @deptId"); params.deptId = departmentId; }
  if (designation != null) { sets.push("designation = @desig"); params.desig = designation; }
  if (role != null) { sets.push("role = @role"); params.role = role; }
  if (roleId != null) { sets.push("role_id = @roleId"); params.roleId = roleId; }
  if (reportingManagerId != null) { sets.push("reporting_manager_id = @rmId"); params.rmId = reportingManagerId; }
  if (avatarUrl !== undefined) { sets.push("avatar_url = @avatar"); params.avatar = avatarUrl || null; }
  if (permissions !== undefined) { sets.push("permissions = @permissions"); params.permissions = permissions ? JSON.stringify(normalizePermissions(permissions)) : null; }
  if (status != null) { sets.push("status = @status"); params.status = status; }
  if (!sets.length) { res.status(400).json({ error: "No fields to update" }); return; }
  sets.push("updated_at = SYSDATETIMEOFFSET()");
  const [user] = await qRaw<User>(`UPDATE users SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id`, params);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "update", entityType: "user", entityId: user.id, userId: authUser.userId });
  res.json(await enrichUser(user));
});

router.delete("/users/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  await q`DELETE FROM users WHERE id = ${id}`;
  const authUser = (req as any).user;
  await createAuditLog({ action: "delete", entityType: "user", entityId: id, userId: authUser.userId });
  res.sendStatus(204);
});

// ── Departments ──────────────────────────────────────────────────────────────

router.get("/departments", authMiddleware, async (_req, res): Promise<void> => {
  const depts = await q`SELECT * FROM departments`;
  const users = await q<{ id: number; departmentId: number | null }>`SELECT id, department_id FROM users`;
  const result = depts.map((d: any) => ({
    id: d.id, name: d.name, description: d.description ?? null, headId: d.headId ?? null, headName: null,
    userCount: users.filter(u => u.departmentId === d.id).length,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
  }));
  res.json(result);
});

router.post("/departments", authMiddleware, async (req, res): Promise<void> => {
  const { name, description, headId } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [dept] = await q`
    INSERT INTO departments (name, description, head_id, ticket_enabled, is_housekeeping, created_at, updated_at)
    OUTPUT INSERTED.*
    VALUES (${name}, ${description ?? null}, ${headId ?? null}, 1, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  res.status(201).json({ id: dept.id, name: dept.name, description: dept.description ?? null, headId: dept.headId ?? null, headName: null, userCount: 0, createdAt: dept.createdAt instanceof Date ? dept.createdAt.toISOString() : dept.createdAt });
});

router.patch("/departments/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const { name, description, headId } = req.body;
  const sets: string[] = ["updated_at = SYSDATETIMEOFFSET()"];
  const params: Record<string, any> = { id };
  if (name) { sets.push("name = @name"); params.name = name; }
  if (description != null) { sets.push("description = @desc"); params.desc = description; }
  if (headId != null) { sets.push("head_id = @headId"); params.headId = headId; }
  const [dept] = await qRaw(`UPDATE departments SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id`, params);
  if (!dept) { res.status(404).json({ error: "Department not found" }); return; }
  res.json({ id: dept.id, name: dept.name, description: dept.description ?? null, headId: dept.headId ?? null, headName: null, userCount: 0, createdAt: dept.createdAt instanceof Date ? dept.createdAt.toISOString() : dept.createdAt });
});

router.delete("/departments/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  await q`DELETE FROM departments WHERE id = ${id}`;
  res.sendStatus(204);
});

// ── Roles ────────────────────────────────────────────────────────────────────

router.get("/roles", authMiddleware, async (_req, res): Promise<void> => {
  await ensureRolePermissionsColumn();
  const roles = await q`SELECT * FROM roles`;
  res.json(roles.map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    level: r.level,
    permissions: normalizePermissions(r.permissions).length ? normalizePermissions(r.permissions) : defaultPermissionsForRole(r.name, r.level),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  })));
});

router.post("/roles", authMiddleware, async (req, res): Promise<void> => {
  await ensureRolePermissionsColumn();
  const { name, description, level, permissions } = req.body;
  if (!name || level == null) { res.status(400).json({ error: "Name and level required" }); return; }
  const normalizedPermissions = normalizePermissions(permissions);
  const [role] = await q`
    INSERT INTO roles (name, description, level, permissions, created_at, updated_at)
    OUTPUT INSERTED.*
    VALUES (${name}, ${description ?? null}, ${level}, ${JSON.stringify(normalizedPermissions.length ? normalizedPermissions : defaultPermissionsForRole(name, Number(level)))}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  res.status(201).json({ id: role.id, name: role.name, description: role.description ?? null, level: role.level, permissions: normalizePermissions(role.permissions), createdAt: role.createdAt instanceof Date ? role.createdAt.toISOString() : role.createdAt });
});

router.patch("/roles/:id", authMiddleware, async (req, res): Promise<void> => {
  await ensureRolePermissionsColumn();
  const id = paramId(req.params.id);
  const { name, description, level, permissions } = req.body;
  const sets: string[] = ["updated_at = SYSDATETIMEOFFSET()"];
  const params: Record<string, any> = { id };
  if (name) { sets.push("name = @name"); params.name = name; }
  if (description != null) { sets.push("description = @desc"); params.desc = description; }
  if (level != null) { sets.push("level = @level"); params.level = level; }
  if (permissions !== undefined) { sets.push("permissions = @permissions"); params.permissions = JSON.stringify(normalizePermissions(permissions)); }
  const [role] = await qRaw(`UPDATE roles SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id`, params);
  if (!role) { res.status(404).json({ error: "Role not found" }); return; }
  const normalizedPermissions = normalizePermissions(role.permissions);
  res.json({ id: role.id, name: role.name, description: role.description ?? null, level: role.level, permissions: normalizedPermissions.length ? normalizedPermissions : defaultPermissionsForRole(role.name, role.level), createdAt: role.createdAt instanceof Date ? role.createdAt.toISOString() : role.createdAt });
});

router.delete("/roles/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  await q`DELETE FROM roles WHERE id = ${id}`;
  res.sendStatus(204);
});

export default router;
