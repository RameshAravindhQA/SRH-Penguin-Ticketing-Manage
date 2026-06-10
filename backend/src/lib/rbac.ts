import { Request, Response, NextFunction } from "express";
import { q, qRaw } from "@workspace/db";
import type { JwtPayload } from "./auth";
import { logger } from "./logger";

export const RBAC_PERMISSIONS = [
  "dashboard.read",
  "tickets.read",
  "tickets.create",
  "tickets.update",
  "tickets.delete",
  "tickets.status",
  "tickets.assign",
  "tickets.reassign",
  "tickets.forward",
  "tickets.verify",
  "tickets.comment",
  "tickets.attachments",
  "tickets.routines",
  "tickets.selfAssign",
  "projects.read",
  "projects.create",
  "projects.update",
  "projects.delete",
  "projects.collaborators",
  "projects.workflow",
  "projects.approvals",
  "projects.export",
  "todos.read",
  "todos.create",
  "todos.update",
  "todos.delete",
  "calendar.read",
  "calendar.create",
  "calendar.update",
  "calendar.delete",
  "calendar.sync",
  "documents.read",
  "documents.create",
  "documents.update",
  "documents.delete",
  "timesheets.read",
  "timesheets.create",
  "timesheets.update",
  "timesheets.delete",
  "users.read",
  "users.create",
  "users.update",
  "users.delete",
  "roles.read",
  "roles.create",
  "roles.update",
  "roles.delete",
  "settings.departments",
  "settings.categories",
  "settings.integrations",
  "audit.read",
] as const;

export type RbacPermission = typeof RBAC_PERMISSIONS[number];

const ALL_PERMISSIONS = new Set<string>(RBAC_PERMISSIONS);

function normalizeRole(value?: string | null): string {
  return String(value ?? "").toLowerCase().replace(/\s+/g, "_");
}

function parsePermissions(value: unknown): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.filter(permission => ALL_PERMISSIONS.has(String(permission))).map(String);
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(permission => ALL_PERMISSIONS.has(String(permission))).map(String) : null;
  } catch {
    return value.split(",").map(part => part.trim()).filter(permission => ALL_PERMISSIONS.has(permission));
  }
}

export function defaultPermissionsForRole(role: string, level?: number | null): string[] {
  const normalized = normalizeRole(role);
  if (normalized.includes("admin") || level === 1) return [...RBAC_PERMISSIONS];
  if (normalized.includes("manager") || level === 2) {
    return [...RBAC_PERMISSIONS].filter(permission => !permission.startsWith("roles.") && permission !== "users.delete");
  }
  if (normalized.includes("lead")) {
    return [
      "dashboard.read",
      "tickets.read", "tickets.create", "tickets.update", "tickets.status", "tickets.assign", "tickets.reassign",
      "tickets.forward", "tickets.verify", "tickets.comment", "tickets.attachments", "tickets.routines", "tickets.selfAssign",
      "projects.read", "projects.create", "projects.update", "projects.collaborators", "projects.workflow", "projects.approvals", "projects.export",
      "todos.read", "todos.create", "todos.update", "todos.delete",
      "calendar.read", "calendar.create", "calendar.update", "calendar.delete", "calendar.sync",
      "documents.read", "documents.create", "documents.update",
      "timesheets.read", "timesheets.create", "timesheets.update",
      "users.read",
    ];
  }
  if (level === 4 || normalized.includes("viewer")) {
    return ["dashboard.read", "tickets.read", "projects.read", "todos.read", "calendar.read", "documents.read", "timesheets.read"];
  }
  return [
    "dashboard.read",
    "tickets.read", "tickets.create", "tickets.update", "tickets.status", "tickets.comment", "tickets.attachments", "tickets.selfAssign",
    "projects.read", "projects.update", "projects.workflow",
    "todos.read", "todos.create", "todos.update", "todos.delete",
    "calendar.read", "calendar.create", "calendar.update", "calendar.delete",
    "documents.read", "documents.create",
    "timesheets.read", "timesheets.create",
  ];
}

export function normalizePermissions(input: unknown): string[] {
  return [...new Set((parsePermissions(input) ?? []).filter(permission => ALL_PERMISSIONS.has(permission)))];
}

export async function ensureRolePermissionsColumn(): Promise<void> {
  await qRaw(
    `IF COL_LENGTH('roles', 'permissions') IS NULL
     ALTER TABLE roles ADD permissions NVARCHAR(MAX) NULL`,
  );
}

export async function ensureUserPermissionsColumn(): Promise<void> {
  await qRaw(
    `IF COL_LENGTH('users', 'permissions') IS NULL
     ALTER TABLE users ADD permissions NVARCHAR(MAX) NULL`,
  );
}

export async function permissionsForUser(user: JwtPayload): Promise<Set<string>> {
  if (normalizeRole(user.role).includes("admin")) return new Set(RBAC_PERMISSIONS);
  await ensureRolePermissionsColumn();
  await ensureUserPermissionsColumn();
  const [row] = await q<{ role: string; level: number | null; rolePermissions: string | null; userPermissions: string | null }>`
    SELECT TOP 1 u.role AS role, r.level AS level, r.permissions AS rolePermissions, u.permissions AS userPermissions
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.id = ${user.userId}
  `;
  const roleExplicit = parsePermissions(row?.rolePermissions);
  const rolePermissions = roleExplicit?.length
    ? roleExplicit
    : defaultPermissionsForRole(row?.role ?? user.role, row?.level ?? null);
  const userExplicit = parsePermissions(row?.userPermissions);
  const merged = new Set(rolePermissions);
  (userExplicit ?? []).forEach(permission => merged.add(permission));
  return merged;
}

function permissionForRequest(req: Request): string | null {
  const method = req.method.toUpperCase();
  const path = req.path.replace(/^\/api/, "");
  if (path.startsWith("/health")) return null;
  if (path.startsWith("/auth/")) return null;
  if (path.startsWith("/dashboard")) return "dashboard.read";
  if (path.startsWith("/audit-logs")) return "audit.read";
  if (path.startsWith("/notification-preferences")) return method === "GET" ? null : "settings.integrations";
  if (path.startsWith("/notifications")) return null;

  if (path.startsWith("/tickets")) {
    if (path.includes("/comments")) return method === "GET" ? "tickets.read" : "tickets.comment";
    if (path.includes("/attachments")) return method === "GET" ? "tickets.read" : "tickets.attachments";
    if (path.includes("/assignments")) return "tickets.read";
    if (path.includes("/assign")) return "tickets.assign";
    if (path.includes("/reassign")) return "tickets.reassign";
    if (path.includes("/forward")) return "tickets.forward";
    if (path.includes("/verify")) return "tickets.verify";
    if (path.includes("/status") || path.includes("/acknowledge") || path.includes("/reject") || path.includes("/reopen")) return "tickets.status";
    if (method === "GET") return "tickets.read";
    if (method === "POST") return "tickets.create";
    if (method === "PATCH") return "tickets.update";
    if (method === "DELETE") return "tickets.delete";
  }
  if (path.startsWith("/ticket-routines")) {
    if (method === "GET") return "tickets.read";
    return "tickets.routines";
  }
  if (path.startsWith("/worklist")) return method === "GET" ? "tickets.read" : "tickets.selfAssign";

  if (path.startsWith("/projects")) {
    if (path.includes("/export-data")) return "projects.export";
    if (path.includes("/collaborators")) return method === "GET" ? "projects.read" : "projects.collaborators";
    if (path.includes("/workflow")) return method === "GET" ? "projects.read" : "projects.workflow";
    if (path.includes("/approvals") || path.includes("/flags")) return method === "GET" ? "projects.read" : "projects.approvals";
    if (path.includes("/comments") || path.includes("/activity")) return method === "GET" ? "projects.read" : "projects.update";
    if (method === "GET") return "projects.read";
    if (method === "POST") return "projects.create";
    if (method === "PATCH") return "projects.update";
    if (method === "DELETE") return "projects.delete";
  }

  if (path.startsWith("/todos")) return crudPermission("todos", method);
  if (path.startsWith("/calendar/google") || path.startsWith("/calendar/availability")) return "calendar.sync";
  if (path.startsWith("/calendar/events")) return crudPermission("calendar", method);
  if (path.startsWith("/documents") || path.startsWith("/document-folders")) return crudPermission("documents", method);
  if (path.startsWith("/timesheets")) return crudPermission("timesheets", method);
  if (path.startsWith("/users/tree")) return "users.read";
  if (path.startsWith("/users")) return crudPermission("users", method);
  if (path.startsWith("/roles")) return crudPermission("roles", method);
  if (path.startsWith("/departments")) return method === "GET" ? "users.read" : "settings.departments";
  if (path.startsWith("/categories") || path.startsWith("/ticket-types") || path.startsWith("/sub-categories")) {
    return method === "GET" ? "tickets.read" : "settings.categories";
  }
  return null;
}

function crudPermission(feature: string, method: string): string | null {
  if (method === "GET") return `${feature}.read`;
  if (method === "POST") return `${feature}.create`;
  if (method === "PATCH") return `${feature}.update`;
  if (method === "DELETE") return `${feature}.delete`;
  return null;
}

export async function rbacMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const required = permissionForRequest(req);
  if (!required) { next(); return; }
  try {
    const authUser = (req as any).user as JwtPayload | undefined;
    if (!authUser) { res.status(401).json({ error: "Unauthorized" }); return; }
    const permissions = await permissionsForUser(authUser);
    if (permissions.has(required)) { next(); return; }
    res.status(403).json({ error: "Forbidden", permission: required });
  } catch (err) {
    logger.error({ err, path: req.path }, "RBAC check failed");
    res.status(500).json({ error: "Permission check failed" });
  }
}
