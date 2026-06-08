export type TicketTypeMaster = {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  createdAt: string;
};

export type SubCategoryMaster = {
  id: number;
  name: string;
  categoryId: number;
  categoryName?: string | null;
  type: string;
  description?: string | null;
  createdAt: string;
};

export type MasterInput = {
  name: string;
  code?: string;
  categoryId?: number;
  type?: string;
  description?: string;
};

const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:6001";

async function masterFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const listTicketTypes = () => masterFetch<TicketTypeMaster[]>("/api/ticket-types");
export const createTicketType = (data: MasterInput) => masterFetch<TicketTypeMaster>("/api/ticket-types", {
  method: "POST",
  body: JSON.stringify(data),
});
export const updateTicketType = (id: number, data: MasterInput) => masterFetch<TicketTypeMaster>(`/api/ticket-types/${id}`, {
  method: "PATCH",
  body: JSON.stringify(data),
});
export const deleteTicketType = (id: number) => masterFetch<void>(`/api/ticket-types/${id}`, { method: "DELETE" });

export const listSubCategories = () => masterFetch<SubCategoryMaster[]>("/api/sub-categories");
export const createSubCategory = (data: MasterInput) => masterFetch<SubCategoryMaster>("/api/sub-categories", {
  method: "POST",
  body: JSON.stringify(data),
});
export const updateSubCategory = (id: number, data: MasterInput) => masterFetch<SubCategoryMaster>(`/api/sub-categories/${id}`, {
  method: "PATCH",
  body: JSON.stringify(data),
});
export const deleteSubCategory = (id: number) => masterFetch<void>(`/api/sub-categories/${id}`, { method: "DELETE" });
