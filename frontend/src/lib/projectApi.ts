export async function projectFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const PROJECT_ROLES = ["owner", "admin", "editor", "contributor", "reviewer", "viewer"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const PROJECT_PERMISSIONS = ["view", "edit", "comment", "flag", "approve", "export", "report"] as const;
export type ProjectPermission = (typeof PROJECT_PERMISSIONS)[number];

export type ProjectCollaborator = {
  userId: number;
  name: string;
  avatarUrl: string | null;
  role: ProjectRole;
  permissions: ProjectPermission[];
  addedById: number | null;
  addedAt: string | null;
  updatedAt: string | null;
};

export type WorkflowNode = {
  id: number;
  name: string;
  nodeType: string;
  sequenceOrder: number;
  description: string | null;
  status: string;
  assignedToId: number | null;
  assignedToName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  transitionSeconds: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectFlag = {
  id: number;
  nodeId: number | null;
  description: string;
  status: string;
  raisedById: number;
  raisedByName: string | null;
  resolvedById: number | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type ProjectApproval = {
  id: number;
  nodeId: number | null;
  status: string;
  remarks: string | null;
  approvedById: number;
  approvedByName: string | null;
  createdAt: string;
};

export type ProjectActivity = {
  id: number;
  nodeId: number | null;
  nodeName: string | null;
  userId: number;
  userName: string | null;
  action: string;
  fromNodeId: number | null;
  fromNodeName: string | null;
  toNodeId: number | null;
  toNodeName: string | null;
  durationSeconds: number | null;
  transitionSeconds: number | null;
  remarks: string | null;
  occurredAt: string;
};

export type UserActivitySummary = {
  userId: number;
  userName: string | null;
  avatarUrl: string | null;
  summary: {
    tasksWorked: number;
    commentsAdded: number;
    flagsRaised: number;
    approvalsPerformed: number;
    daysWorked: number;
    totalHoursWorked: number;
  };
  activities: { id: number; nodeId: number | null; nodeName: string | null; action: string; durationSeconds: number | null; transitionSeconds: number | null; remarks: string | null; occurredAt: string }[];
  comments: { id: number; content: string; createdAt: string }[];
  flags: { id: number; description: string; status: string; createdAt: string }[];
  approvals: { id: number; status: string; remarks: string | null; createdAt: string }[];
};

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
