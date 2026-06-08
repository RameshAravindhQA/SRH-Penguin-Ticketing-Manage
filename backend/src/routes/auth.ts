import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, departmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, authMiddleware } from "../lib/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, username))
    .limit(1);

  if (!user) {
    const [byCode] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.employeeCode, username))
      .limit(1);
    if (!byCode) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, byCode.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, byCode.id));
    const token = signToken({ userId: byCode.id, role: byCode.role, email: byCode.email });
    await createAuditLog({ action: "login", entityType: "user", entityId: byCode.id, userId: byCode.id, ipAddress: req.ip });
    res.json({ token, user: formatUser(byCode, null) });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));
  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  await createAuditLog({ action: "login", entityType: "user", entityId: user.id, userId: user.id, ipAddress: req.ip });
  res.json({ token, user: formatUser(user, null) });
});

router.post("/auth/logout", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  await createAuditLog({ action: "logout", entityType: "user", entityId: authUser.userId, userId: authUser.userId, ipAddress: req.ip });
  res.json({ success: true });
});

router.get("/auth/me", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  let deptName: string | null = null;
  if (user.departmentId) {
    const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, user.departmentId)).limit(1);
    deptName = dept?.name ?? null;
  }
  res.json(formatUser(user, deptName));
});

router.post("/auth/change-password", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { currentPassword, newPassword } = req.body;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }
  const hash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, user.id));
  res.json({ success: true });
});

function formatUser(u: any, deptName: string | null) {
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
    lastLogin: u.lastLogin?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

export { formatUser };
export default router;
