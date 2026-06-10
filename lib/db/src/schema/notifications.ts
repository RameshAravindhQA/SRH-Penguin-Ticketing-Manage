export type Notification = {
  id: number;
  userId: number;
  type: string;
  message: string;
  entityType: string | null;
  entityId: number | null;
  entityRef: string | null;
  isRead: boolean;
  createdAt: Date;
};

export type InsertNotification = Omit<Notification, "id" | "createdAt">;
