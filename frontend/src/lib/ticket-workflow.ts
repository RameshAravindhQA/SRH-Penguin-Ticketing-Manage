const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:6001";

async function workflowFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type TicketAssignment = {
  id: number;
  ticketId: number;
  assignedToId: number;
  assignedToName?: string | null;
  assignedById?: number | null;
  assignedByName?: string | null;
  assignedAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  status: string;
  remarks?: string | null;
  reopenCount: number;
  assetNo?: string | null;
  assetType?: string | null;
  classificationType?: string | null;
  classificationCategory?: string | null;
  classificationIssue?: string | null;
};

export type TicketRoutine = {
  id: number;
  routineNo: string;
  subject: string;
  description?: string | null;
  status: string;
  priority: string;
  categoryId?: number | null;
  categoryName?: string | null;
  type: string;
  schedule: string;
  departmentId?: number | null;
  departmentName?: string | null;
  raisedByName?: string | null;
  startDate?: string | null;
  closingDate?: string | null;
  assignToIds: number[];
  assignCcIds: number[];
  createdAt: string;
};

export type TicketRoutineInput = {
  subject: string;
  description?: string;
  priority: string;
  categoryId?: number;
  type?: string;
  schedule: string;
  departmentId?: number;
  startDate?: string;
  closingDate?: string;
  assignToIds?: number[];
  assignCcIds?: number[];
  days?: number[];
  status?: string;
};

export const listTicketAssignments = (ticketId: number) => workflowFetch<TicketAssignment[]>(`/api/tickets/${ticketId}/assignments`);
export const reopenTicket = (ticketId: number, data: { remarks: string; assignedToId?: number }) => workflowFetch(`/api/tickets/${ticketId}/reopen`, {
  method: "POST",
  body: JSON.stringify(data),
});
export const verifyTicket = (ticketId: number, data: { approved: boolean; remarks?: string }) => workflowFetch(`/api/tickets/${ticketId}/verify`, {
  method: "POST",
  body: JSON.stringify(data),
});
export const listTicketRoutines = () => workflowFetch<TicketRoutine[]>("/api/ticket-routines");
export const createTicketRoutine = (data: TicketRoutineInput) => workflowFetch<TicketRoutine>("/api/ticket-routines", {
  method: "POST",
  body: JSON.stringify(data),
});
export const updateTicketRoutine = (id: number, data: TicketRoutineInput) => workflowFetch<TicketRoutine>(`/api/ticket-routines/${id}`, {
  method: "PATCH",
  body: JSON.stringify(data),
});
export const deleteTicketRoutine = (id: number) => workflowFetch<void>(`/api/ticket-routines/${id}`, { method: "DELETE" });
