export type NotificationPreferences = {
  userId: number;
  inAppEnabled: boolean;
  spaceEnabled: boolean;
  mailEnabled: boolean;
  calendarEnabled: boolean;
  updatedAt: string | null;
};

export type NotificationPreferenceUpdate = Partial<
  Pick<NotificationPreferences, "inAppEnabled" | "spaceEnabled" | "mailEnabled" | "calendarEnabled">
>;

const apiBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:6001").replace(/\/+$/, "");

async function preferencesFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
  return response.json() as Promise<T>;
}

export const getNotificationPreferences = () =>
  preferencesFetch<NotificationPreferences>("/api/notification-preferences");

export const updateNotificationPreferences = (data: NotificationPreferenceUpdate) =>
  preferencesFetch<NotificationPreferences>("/api/notification-preferences", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
