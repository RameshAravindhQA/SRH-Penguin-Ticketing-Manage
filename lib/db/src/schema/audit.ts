export type AuditLog = {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  entityRef: string | null;
  userId: number;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  createdAt: Date;
};

export type InsertAuditLog = Omit<AuditLog, "id" | "createdAt">;
