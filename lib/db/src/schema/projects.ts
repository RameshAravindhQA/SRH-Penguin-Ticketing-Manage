export type Project = {
  id: number;
  projectNo: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  subCategoryId: number | null;
  type: string | null;
  systemType: string | null;
  systemSubType: string | null;
  systemTypeNo: string | null;
  institute: string | null;
  sourceDepartment: string | null;
  serviceType: string | null;
  location: string | null;
  departmentName: string | null;
  remarks: string | null;
  progress: number;
  ownerId: number | null;
  associateId: number | null;
  associateCcIds: string | null;
  processOwnerId: number | null;
  startDate: string | null;
  endDate: string | null;
  finalDeadline: Date | null;
  reviewFrequency: string | null;
  reviewSchedule: number | null;
  reviewDays: string | null;
  reviewDuration: string | null;
  isExternal: boolean;
  organizationName: string | null;
  providerName: string | null;
  externalPersonRole: string | null;
  externalPhoneNo: string | null;
  supportingPerson: string | null;
  fileGroupId: string | null;
  legacyTicketNewId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectCollaborator = {
  id: number;
  projectId: number;
  userId: number;
  role: string | null;
  permissions: string | null;
  addedById: number | null;
  addedAt: Date;
  updatedAt: Date;
};

export type ProjectComment = {
  id: number;
  projectId: number;
  content: string;
  authorId: number;
  createdAt: Date;
};

export type ProjectWorkflowNode = {
  id: number;
  projectId: number;
  name: string;
  nodeType: string;
  sequenceOrder: number;
  description: string | null;
  status: string;
  assignedToId: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  durationSeconds: number | null;
  transitionSeconds: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectNodeActivity = {
  id: number;
  projectId: number;
  nodeId: number;
  userId: number;
  action: string;
  fromNodeId: number | null;
  toNodeId: number | null;
  durationSeconds: number | null;
  transitionSeconds: number | null;
  remarks: string | null;
  occurredAt: Date;
};

export type ProjectFlag = {
  id: number;
  projectId: number;
  nodeId: number | null;
  raisedById: number;
  description: string;
  status: string;
  resolvedById: number | null;
  resolvedAt: Date | null;
  createdAt: Date;
};

export type ProjectApproval = {
  id: number;
  projectId: number;
  nodeId: number | null;
  approvedById: number;
  status: string;
  remarks: string | null;
  createdAt: Date;
};

export type InsertProject = Omit<Project, "id" | "projectNo" | "createdAt" | "updatedAt">;
