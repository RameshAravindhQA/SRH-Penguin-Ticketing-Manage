import { pgTable, text, serial, integer, timestamp, boolean, date, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNo: text("ticket_no").notNull().unique(),
  subject: text("subject").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  categoryId: integer("category_id"),
  subCategoryId: integer("sub_category_id"),
  type: text("type").notNull().default("general"),
  createdById: integer("created_by_id").notNull(),
  assignedToId: integer("assigned_to_id"),
  assignedDepartmentId: integer("assigned_department_id"),
  sourceDepartment: text("source_department"),
  projectId: integer("project_id"),
  systemTypeId: integer("system_type_id"),
  systemType: text("system_type"),
  systemSubType: text("system_sub_type"),
  systemTypeNo: text("system_type_no"),
  serviceType: text("service_type"),
  institute: text("institute"),
  location: text("location"),
  ownerId: integer("owner_id"),
  associateId: integer("associate_id"),
  associateCcIds: text("associate_cc_ids"),
  assignedById: integer("assigned_by_id"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  expectedCloseDate: timestamp("expected_close_date", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  submittedForVerificationAt: timestamp("submitted_for_verification_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedById: integer("verified_by_id"),
  verificationRemarks: text("verification_remarks"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledById: integer("cancelled_by_id"),
  reopenCount: integer("reopen_count").notNull().default(0),
  reopenedAt: timestamp("reopened_at", { withTimezone: true }),
  reopenRemarks: text("reopen_remarks"),
  reviewSchedule: integer("review_schedule"),
  reviewDays: text("review_days"),
  reviewDuration: text("review_duration"),
  isExternal: boolean("is_external").notNull().default(false),
  organizationName: text("organization_name"),
  providerName: text("provider_name"),
  externalPersonRole: text("external_person_role"),
  externalPhoneNo: text("external_phone_no"),
  supportingPerson: text("supporting_person"),
  fileGroupId: text("file_group_id"),
  legacyTicketId: integer("legacy_ticket_id"),
  slaBreached: boolean("sla_breached").notNull().default(false),
  forwardedFromId: integer("forwarded_from_id"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const ticketCommentsTable = pgTable("ticket_comments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  assignmentId: integer("assignment_id"),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull(),
  assetNo: text("asset_no"),
  assetType: text("asset_type"),
  uploadFileNames: text("upload_file_names"),
  uploadFileUsers: text("upload_file_users"),
  commentedOn: timestamp("commented_on", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketCommentRepliesTable = pgTable("ticket_comment_replies", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull(),
  content: text("content").notNull(),
  repliedById: integer("replied_by_id"),
  repliedByName: text("replied_by_name"),
  replyTo: text("reply_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketHistoryTable = pgTable("ticket_history", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  action: text("action").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  performedById: integer("performed_by_id").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketAttachmentsTable = pgTable("ticket_attachments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  documentName: text("document_name"),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  contentBase64: text("content_base64").notNull(),
  description: text("description"),
  documentDate: date("document_date", { mode: "string" }),
  cost: real("cost"),
  visibleToUsers: text("visible_to_users"),
  uploadedById: integer("uploaded_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketAssignmentsTable = pgTable("ticket_assignments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  assignedToId: integer("assigned_to_id").notNull(),
  assignedById: integer("assigned_by_id"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  status: text("status").notNull().default("assigned"),
  remarks: text("remarks"),
  reopenCount: integer("reopen_count").notNull().default(0),
  previousAssignmentId: integer("previous_assignment_id"),
  redirectedFromAssignmentId: integer("redirected_from_assignment_id"),
  routineUserId: integer("routine_user_id"),
  assetNo: text("asset_no"),
  assetType: text("asset_type"),
  classificationType: text("classification_type"),
  classificationCategory: text("classification_category"),
  classificationIssue: text("classification_issue"),
  isOtherIssue: boolean("is_other_issue").notNull().default(false),
  otherIssue: text("other_issue"),
  staffName: text("staff_name"),
  staffCode: text("staff_code"),
  endedAtSource: text("ended_at_source"),
  obsoleteAt: timestamp("obsolete_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketAssignmentCcTable = pgTable("ticket_assignment_cc", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  userId: integer("user_id").notNull(),
  assignedById: integer("assigned_by_id"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  reopenCount: integer("reopen_count").notNull().default(0),
  routineUserId: integer("routine_user_id"),
  obsoleteAt: timestamp("obsolete_at", { withTimezone: true }),
});

export const ticketFromDepartmentsTable = pgTable("ticket_from_departments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  departmentName: text("department_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketPendingLogsTable = pgTable("ticket_pending_logs", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  pendingStartedAt: timestamp("pending_started_at", { withTimezone: true }),
  pendingEndedAt: timestamp("pending_ended_at", { withTimezone: true }),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketRoutineTable = pgTable("ticket_routines", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id"),
  routineNo: text("routine_no").notNull().unique(),
  subject: text("subject").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  priority: text("priority").notNull().default("medium"),
  categoryId: integer("category_id"),
  type: text("type").notNull().default("routine"),
  schedule: text("schedule").notNull().default("daily"),
  startDate: timestamp("start_date", { withTimezone: true }),
  closingDate: timestamp("closing_date", { withTimezone: true }),
  raisedById: integer("raised_by_id"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledById: integer("cancelled_by_id"),
  legacyRoutineId: integer("legacy_routine_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const ticketRoutineUsersTable = pgTable("ticket_routine_users", {
  id: serial("id").primaryKey(),
  routineId: integer("routine_id").notNull(),
  userId: integer("user_id").notNull(),
  assignedById: integer("assigned_by_id"),
  assignCategory: text("assign_category").notNull().default("to"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  obsoleteAt: timestamp("obsolete_at", { withTimezone: true }),
});

export const ticketRoutineScheduleDaysTable = pgTable("ticket_routine_schedule_days", {
  id: serial("id").primaryKey(),
  routineUserId: integer("routine_user_id").notNull(),
  dayValue: integer("day_value").notNull(),
  dayType: text("day_type").notNull().default("week"),
  obsoleteAt: timestamp("obsolete_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketLocationsTable = pgTable("ticket_locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  block: text("block"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketIssuesTable = pgTable("ticket_issues", {
  id: serial("id").primaryKey(),
  typeId: integer("type_id"),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketSequencesTable = pgTable("ticket_sequences", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id"),
  sequenceType: text("sequence_type").notNull(),
  currentValue: integer("current_value").notNull().default(0),
  financialYear: text("financial_year"),
  remarks: text("remarks"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const ticketSubMembersTable = pgTable("ticket_sub_members", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  role: text("role"),
  userId: integer("user_id"),
  userName: text("user_name"),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  description: text("description"),
  departmentType: text("department_type"),
  status: text("status").notNull().default("active"),
  obsoleteAt: timestamp("obsolete_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({ id: true, ticketNo: true, createdAt: true, updatedAt: true });
export const insertCommentSchema = createInsertSchema(ticketCommentsTable).omit({ id: true, createdAt: true });
export const insertTicketAttachmentSchema = createInsertSchema(ticketAttachmentsTable).omit({ id: true, createdAt: true });
export const insertTicketAssignmentSchema = createInsertSchema(ticketAssignmentsTable).omit({ id: true, createdAt: true });
export const insertTicketRoutineSchema = createInsertSchema(ticketRoutineTable).omit({ id: true, createdAt: true, updatedAt: true });

export type Ticket = typeof ticketsTable.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type TicketComment = typeof ticketCommentsTable.$inferSelect;
export type TicketCommentReply = typeof ticketCommentRepliesTable.$inferSelect;
export type TicketAttachment = typeof ticketAttachmentsTable.$inferSelect;
export type TicketAssignment = typeof ticketAssignmentsTable.$inferSelect;
export type TicketAssignmentCc = typeof ticketAssignmentCcTable.$inferSelect;
export type TicketRoutine = typeof ticketRoutineTable.$inferSelect;
export type TicketRoutineUser = typeof ticketRoutineUsersTable.$inferSelect;
export type TicketRoutineScheduleDay = typeof ticketRoutineScheduleDaysTable.$inferSelect;
export type TicketLocation = typeof ticketLocationsTable.$inferSelect;
export type TicketIssue = typeof ticketIssuesTable.$inferSelect;
export type TicketSequence = typeof ticketSequencesTable.$inferSelect;
export type TicketSubMember = typeof ticketSubMembersTable.$inferSelect;
