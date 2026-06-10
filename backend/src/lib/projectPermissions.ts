export const PROJECT_ROLES = ["owner", "admin", "editor", "contributor", "reviewer", "viewer"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const PROJECT_PERMISSIONS = ["view", "edit", "comment", "flag", "approve", "export", "report"] as const;
export type ProjectPermission = (typeof PROJECT_PERMISSIONS)[number];

// Default permission set granted to each role. Per-collaborator overrides are
// stored as a JSON array in project_collaborators.permissions and merge on top of these.
export const DEFAULT_ROLE_PERMISSIONS: Record<ProjectRole, ProjectPermission[]> = {
  owner: ["view", "edit", "comment", "flag", "approve", "export", "report"],
  admin: ["view", "edit", "comment", "flag", "approve", "export", "report"],
  editor: ["view", "edit", "comment", "flag", "export", "report"],
  contributor: ["view", "edit", "comment", "flag"],
  reviewer: ["view", "comment", "flag", "approve", "report"],
  viewer: ["view"],
};

export function normalizeRole(role: string | null | undefined): ProjectRole {
  const r = (role ?? "").toLowerCase();
  return (PROJECT_ROLES as readonly string[]).includes(r) ? (r as ProjectRole) : "viewer";
}

export function resolvePermissions(role: string | null | undefined, overrides: string | null | undefined): ProjectPermission[] {
  const base = DEFAULT_ROLE_PERMISSIONS[normalizeRole(role)];
  if (!overrides) return base;
  try {
    const parsed = JSON.parse(overrides);
    if (Array.isArray(parsed)) {
      return parsed.filter((p): p is ProjectPermission => (PROJECT_PERMISSIONS as readonly string[]).includes(p));
    }
  } catch {
    // ignore malformed overrides, fall back to role defaults
  }
  return base;
}
