export type Ticket = {
  id: number;
  ticketNo: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  categoryId: number | null;
  subCategoryId: number | null;
  type: string;
  createdById: number;
  assignedToId: number | null;
  assignedDepartmentId: number | null;
  sourceDepartment: string | null;
  projectId: number | null;
  systemTypeId: number | null;
  systemType: string | null;
  systemSubType: string | null;
  systemTypeNo: string | null;
  serviceType: string | null;
  institute: string | null;
  location: string | null;
  ownerId: number | null;
  associateId: number | null;
  associateCcIds: string | null;
  assignedById: number | null;
  assignedAt: Date | null;
  startedAt: Date | null;
  dueDate: Date | null;
  expectedCloseDate: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  submittedForVerificationAt: Date | null;
  verifiedAt: Date | null;
  verifiedById: number | null;
  verificationRemarks: string | null;
  cancelledAt: Date | null;
  cancelledById: number | null;
  reopenCount: number;
  reopenedAt: Date | null;
  reopenRemarks: string | null;
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
  legacyTicketId: number | null;
  slaBreached: boolean;
  forwardedFromId: number | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TicketComment = {
  id: number;
  ticketId: number;
  assignmentId: number | null;
  content: string;
  authorId: number;
  assetNo: string | null;
  assetType: string | null;
  uploadFileNames: string | null;
  uploadFileUsers: string | null;
  commentedOn: Date | null;
  createdAt: Date;
};

export type TicketCommentReply = {
  id: number;
  commentId: number;
  content: string;
  repliedById: number | null;
  repliedByName: string | null;
  replyTo: string | null;
  createdAt: Date;
};

export type TicketAttachment = {
  id: number;
  ticketId: number;
  documentName: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64: string;
  description: string | null;
  documentDate: string | null;
  cost: number | null;
  visibleToUsers: string | null;
  uploadedById: number;
  createdAt: Date;
};

export type TicketAssignment = {
  id: number;
  ticketId: number;
  assignedToId: number;
  assignedById: number | null;
  assignedAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  status: string;
  remarks: string | null;
  reopenCount: number;
  previousAssignmentId: number | null;
  redirectedFromAssignmentId: number | null;
  routineUserId: number | null;
  assetNo: string | null;
  assetType: string | null;
  classificationType: string | null;
  classificationCategory: string | null;
  classificationIssue: string | null;
  isOtherIssue: boolean;
  otherIssue: string | null;
  staffName: string | null;
  staffCode: string | null;
  endedAtSource: string | null;
  obsoleteAt: Date | null;
  createdAt: Date;
};

export type TicketAssignmentCc = {
  id: number;
  ticketId: number;
  userId: number;
  assignedById: number | null;
  assignedAt: Date;
  reopenCount: number;
  routineUserId: number | null;
  obsoleteAt: Date | null;
};

export type TicketRoutine = {
  id: number;
  departmentId: number | null;
  routineNo: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  categoryId: number | null;
  type: string;
  schedule: string;
  startDate: Date | null;
  closingDate: Date | null;
  raisedById: number | null;
  cancelledAt: Date | null;
  cancelledById: number | null;
  legacyRoutineId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TicketRoutineUser = {
  id: number;
  routineId: number;
  userId: number;
  assignedById: number | null;
  assignCategory: string;
  assignedAt: Date;
  obsoleteAt: Date | null;
};

export type TicketRoutineScheduleDay = {
  id: number;
  routineUserId: number;
  dayValue: number;
  dayType: string;
  obsoleteAt: Date | null;
  createdAt: Date;
};

export type TicketLocation = { id: number; name: string; block: string | null; createdAt: Date };
export type TicketIssue = { id: number; typeId: number | null; name: string; status: string; createdAt: Date };
export type TicketSequence = { id: number; departmentId: number | null; sequenceType: string; currentValue: number; financialYear: string | null; remarks: string | null; updatedAt: Date };
export type TicketSubMember = { id: number; ticketId: number; role: string | null; userId: number | null; userName: string | null; startDate: string | null; endDate: string | null; description: string | null; departmentType: string | null; status: string; obsoleteAt: Date | null; createdAt: Date };

export type InsertTicket = Omit<Ticket, "id" | "ticketNo" | "createdAt" | "updatedAt">;
