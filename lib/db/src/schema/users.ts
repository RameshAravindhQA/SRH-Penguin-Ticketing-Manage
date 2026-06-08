import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const departmentsTable = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  headId: integer("head_id"),
  documentPrefix: text("document_prefix"),
  ticketEnabled: boolean("ticket_enabled").notNull().default(true),
  ticketSequencePrefix: text("ticket_sequence_prefix"),
  routineSequencePrefix: text("routine_sequence_prefix"),
  projectSequencePrefix: text("project_sequence_prefix"),
  taskSequencePrefix: text("task_sequence_prefix"),
  mobileNumbers: text("mobile_numbers"),
  isHousekeeping: boolean("is_housekeeping").notNull().default(false),
  legacyDepartmentId: integer("legacy_department_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const rolesTable = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  level: integer("level").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  mobile: text("mobile"),
  departmentId: integer("department_id"),
  designation: text("designation"),
  role: text("role").notNull().default("employee"),
  roleId: integer("role_id"),
  reportingManagerId: integer("reporting_manager_id"),
  avatarUrl: text("avatar_url"),
  status: text("status").notNull().default("active"),
  userType: text("user_type"),
  wardUid: integer("ward_uid"),
  spaceName: text("space_name"),
  isHardwareUser: boolean("is_hardware_user").notNull().default(false),
  isCallCenterUser: boolean("is_call_center_user").notNull().default(false),
  legacyUserId: integer("legacy_user_id"),
  lastLogin: timestamp("last_login", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const userDepartmentAssignmentsTable = pgTable("user_department_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  departmentId: integer("department_id").notNull(),
  activeFrom: timestamp("active_from", { withTimezone: true }),
  activeTo: timestamp("active_to", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userReportingAssignmentsTable = pgTable("user_reporting_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  reportingUserId: integer("reporting_user_id").notNull(),
  activeFrom: timestamp("active_from", { withTimezone: true }),
  activeTo: timestamp("active_to", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDepartmentSchema = createInsertSchema(departmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRoleSchema = createInsertSchema(rolesTable).omit({ id: true, createdAt: true, updatedAt: true });

export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Department = typeof departmentsTable.$inferSelect;
export type Role = typeof rolesTable.$inferSelect;
export type UserDepartmentAssignment = typeof userDepartmentAssignmentsTable.$inferSelect;
export type UserReportingAssignment = typeof userReportingAssignmentsTable.$inferSelect;
