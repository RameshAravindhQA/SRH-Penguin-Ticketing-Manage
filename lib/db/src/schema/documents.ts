import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documentFoldersTable = pgTable("document_folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  description: text("description"),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const documentFilesTable = pgTable("document_files", {
  id: serial("id").primaryKey(),
  folderId: integer("folder_id"),
  name: text("name").notNull(),
  fileName: text("file_name"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  contentBase64: text("content_base64"),
  googleSheetUrl: text("google_sheet_url"),
  description: text("description"),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDocumentFolderSchema = createInsertSchema(documentFoldersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentFileSchema = createInsertSchema(documentFilesTable).omit({ id: true, createdAt: true, updatedAt: true });

export type DocumentFolder = typeof documentFoldersTable.$inferSelect;
export type DocumentFile = typeof documentFilesTable.$inferSelect;
export type InsertDocumentFolder = z.infer<typeof insertDocumentFolderSchema>;
export type InsertDocumentFile = z.infer<typeof insertDocumentFileSchema>;
