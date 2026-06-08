import { pgTable, text, serial, integer, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectNo: text("project_no").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("created"),
  priority: text("priority").notNull().default("medium"),
  category: text("category"),
  subCategoryId: integer("sub_category_id"),
  type: text("type"),
  systemType: text("system_type"),
  systemSubType: text("system_sub_type"),
  systemTypeNo: text("system_type_no"),
  institute: text("institute"),
  sourceDepartment: text("source_department"),
  serviceType: text("service_type"),
  location: text("location"),
  departmentName: text("department_name"),
  remarks: text("remarks"),
  progress: integer("progress").notNull().default(0),
  ownerId: integer("owner_id"),
  associateId: integer("associate_id"),
  associateCcIds: text("associate_cc_ids"),
  processOwnerId: integer("process_owner_id"),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  finalDeadline: timestamp("final_deadline", { withTimezone: true }),
  reviewFrequency: text("review_frequency"),
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
  legacyTicketNewId: integer("legacy_ticket_new_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const projectCollaboratorsTable = pgTable("project_collaborators", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role"),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectCommentsTable = pgTable("project_comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, projectNo: true, createdAt: true, updatedAt: true });

export type Project = typeof projectsTable.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectCollaborator = typeof projectCollaboratorsTable.$inferSelect;
export type ProjectComment = typeof projectCommentsTable.$inferSelect;
