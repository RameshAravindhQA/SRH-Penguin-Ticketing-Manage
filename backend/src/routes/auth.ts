import { Router } from "express";
import bcrypt from "bcryptjs";
import { q } from "@workspace/db";
import type { User } from "@workspace/db";
import {
  LOCAL_BYPASS_TOKEN,
  authMiddleware,
  isAuthBypassEnabled,
  signToken,
} from "../lib/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

export function formatUser(u: any, deptName: string | null) {
  return {
    id: u.id,
    employeeCode: u.employeeCode,
    name: u.name,
    email: u.email,
    mobile: u.mobile ?? null,
    departmentId: u.departmentId ?? null,
    departmentName: deptName,
    designation: u.designation ?? null,
    role: u.role,
    roleId: u.roleId ?? null,
    reportingManagerId: u.reportingManagerId ?? null,
    reportingManagerName: null,
    avatarUrl: u.avatarUrl ?? null,
    status: u.status,
    lastLogin: u.lastLogin instanceof Date ? u.lastLogin.toISOString() : u.lastLogin ?? null,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
  };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  if (isAuthBypassEnabled()) {
    res.json({ token: LOCAL_BYPASS_TOKEN, user: localBypassUser() });
    return;
  }

  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  let users = await q<User>`SELECT TOP 1 * FROM users WHERE email = ${username}`;
  if (!users.length) {
    users = await q<User>`SELECT TOP 1 * FROM users WHERE employee_code = ${username}`;
  }
  if (!users.length) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const user = users[0];
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await q`UPDATE users SET last_login = SYSDATETIMEOFFSET() WHERE id = ${user.id}`;
  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  await createAuditLog({ action: "login", entityType: "user", entityId: user.id, userId: user.id, ipAddress: req.ip });

  let deptName: string | null = null;
  if (user.departmentId) {
    const [d] = await q<{ name: string }>`SELECT TOP 1 name FROM departments WHERE id = ${user.departmentId}`;
    deptName = d?.name ?? null;
  }
  res.json({ token, user: formatUser(user, deptName) });
});

router.post("/auth/logout", authMiddleware, async (req, res): Promise<void> => {
  if (isAuthBypassEnabled()) { res.json({ success: true }); return; }
  const authUser = (req as any).user;
  await createAuditLog({ action: "logout", entityType: "user", entityId: authUser.userId, userId: authUser.userId, ipAddress: req.ip });
  res.json({ success: true });
});

router.get("/auth/me", authMiddleware, async (req, res): Promise<void> => {
  if (isAuthBypassEnabled()) { res.json(localBypassUser()); return; }
  const authUser = (req as any).user;
  const [user] = await q<User>`SELECT TOP 1 * FROM users WHERE id = ${authUser.userId}`;
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  let deptName: string | null = null;
  if (user.departmentId) {
    const [d] = await q<{ name: string }>`SELECT TOP 1 name FROM departments WHERE id = ${user.departmentId}`;
    deptName = d?.name ?? null;
  }
  res.json(formatUser(user, deptName));
});

router.post("/auth/change-password", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { currentPassword, newPassword } = req.body;
  const [user] = await q<User>`SELECT TOP 1 * FROM users WHERE id = ${authUser.userId}`;
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }
  const hash = await bcrypt.hash(newPassword, 12);
  await q`UPDATE users SET password_hash = ${hash}, updated_at = SYSDATETIMEOFFSET() WHERE id = ${user.id}`;
  res.json({ success: true });
});

function localBypassUser() {
  return {
    id: 1, employeeCode: "EMP-001", name: "Local Admin", email: "admin@company.com",
    mobile: null, departmentId: 1, departmentName: "Local Development", designation: "Administrator",
    role: "admin", roleId: 1, reportingManagerId: null, reportingManagerName: null, avatarUrl: null,
    status: "active", lastLogin: new Date().toISOString(), createdAt: new Date().toISOString(),
  };
}

export default router;
