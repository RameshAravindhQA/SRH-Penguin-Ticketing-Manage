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

export type RbacPermission = (typeof RBAC_PERMISSIONS)[number];

export const PERMISSION_GROUPS = [
  { title: "Dashboard", permissions: ["dashboard.read"] as const },
  {
    title: "Tickets",
    permissions: [
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
    ] as const,
  },
  {
    title: "Projects",
    permissions: [
      "projects.read",
      "projects.create",
      "projects.update",
      "projects.delete",
      "projects.collaborators",
      "projects.workflow",
      "projects.approvals",
      "projects.export",
    ] as const,
  },
  {
    title: "Todos",
    permissions: ["todos.read", "todos.create", "todos.update", "todos.delete"] as const,
  },
  {
    title: "Calendar",
    permissions: ["calendar.read", "calendar.create", "calendar.update", "calendar.delete", "calendar.sync"] as const,
  },
  {
    title: "Documents",
    permissions: ["documents.read", "documents.create", "documents.update", "documents.delete"] as const,
  },
  {
    title: "Timesheets",
    permissions: ["timesheets.read", "timesheets.create", "timesheets.update", "timesheets.delete"] as const,
  },
  {
    title: "Users",
    permissions: ["users.read", "users.create", "users.update", "users.delete"] as const,
  },
  {
    title: "Roles",
    permissions: ["roles.read", "roles.create", "roles.update", "roles.delete"] as const,
  },
  {
    title: "Settings",
    permissions: ["settings.departments", "settings.categories", "settings.integrations"] as const,
  },
  { title: "Audit", permissions: ["audit.read"] as const },
] as const;

export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

export function permissionLabel(permission: string) {
  return permission
    .split(".")
    .map(part => part.replace(/_/g, " "))
    .map(part => part.replace(/\b\w/g, char => char.toUpperCase()))
    .join(" ");
}

export function hasPermission(selected: string[], permission: string) {
  return selected.includes(permission);
}

export function togglePermission(selected: string[], permission: string) {
  return selected.includes(permission)
    ? selected.filter(item => item !== permission)
    : [...selected, permission];
}
