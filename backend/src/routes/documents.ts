import { Router } from "express";
import { db, documentFilesTable, documentFoldersTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

function folderDto(folder: any) {
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId ?? null,
    description: folder.description ?? null,
    createdById: folder.createdById,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

function fileDto(file: any) {
  return {
    id: file.id,
    folderId: file.folderId ?? null,
    name: file.name,
    fileName: file.fileName ?? null,
    mimeType: file.mimeType ?? null,
    sizeBytes: file.sizeBytes,
    googleSheetUrl: file.googleSheetUrl ?? null,
    description: file.description ?? null,
    createdById: file.createdById,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
}

router.get("/document-folders", authMiddleware, async (_req, res): Promise<void> => {
  const folders = await db.select().from(documentFoldersTable).orderBy(sql`${documentFoldersTable.name} asc`);
  res.json(folders.map(folderDto));
});

router.post("/document-folders", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { name, parentId, description } = req.body;
  if (!name) { res.status(400).json({ error: "Folder name is required" }); return; }
  const [folder] = await db.insert(documentFoldersTable).values({
    name,
    parentId: parentId ? Number(parentId) : null,
    description: description ?? null,
    createdById: authUser.userId,
  }).returning();
  await createAuditLog({ action: "create", entityType: "document_folder", entityId: folder.id, entityRef: folder.name, userId: authUser.userId });
  res.status(201).json(folderDto(folder));
});

router.patch("/document-folders/:id", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const id = Number(req.params.id);
  const { name, parentId, description } = req.body;
  const [folder] = await db.update(documentFoldersTable).set({
    ...(name ? { name } : {}),
    ...(parentId !== undefined ? { parentId: parentId ? Number(parentId) : null } : {}),
    ...(description !== undefined ? { description: description || null } : {}),
  }).where(eq(documentFoldersTable.id, id)).returning();
  if (!folder) { res.status(404).json({ error: "Folder not found" }); return; }
  await createAuditLog({ action: "update", entityType: "document_folder", entityId: folder.id, entityRef: folder.name, userId: authUser.userId });
  res.json(folderDto(folder));
});

router.delete("/document-folders/:id", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const id = Number(req.params.id);
  await db.update(documentFilesTable).set({ folderId: null }).where(eq(documentFilesTable.folderId, id));
  await db.delete(documentFoldersTable).where(eq(documentFoldersTable.id, id));
  await createAuditLog({ action: "delete", entityType: "document_folder", entityId: id, userId: authUser.userId });
  res.sendStatus(204);
});

router.get("/documents", authMiddleware, async (req, res): Promise<void> => {
  const folderId = req.query["folderId"] ? Number(req.query["folderId"]) : null;
  const files = folderId
    ? await db.select().from(documentFilesTable).where(eq(documentFilesTable.folderId, folderId)).orderBy(sql`${documentFilesTable.createdAt} desc`)
    : await db.select().from(documentFilesTable).orderBy(sql`${documentFilesTable.createdAt} desc`);
  res.json(files.map(fileDto));
});

router.post("/documents", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { name, folderId, fileName, mimeType, sizeBytes, contentBase64, googleSheetUrl, description } = req.body;
  if (!name) { res.status(400).json({ error: "Document name is required" }); return; }
  if (!googleSheetUrl && !contentBase64) { res.status(400).json({ error: "Attach a file or Google Sheet URL" }); return; }
  if (sizeBytes && Number(sizeBytes) > MAX_DOCUMENT_BYTES) { res.status(400).json({ error: "File must be 10 MB or smaller" }); return; }
  const [file] = await db.insert(documentFilesTable).values({
    name,
    folderId: folderId ? Number(folderId) : null,
    fileName: fileName ?? null,
    mimeType: mimeType ?? null,
    sizeBytes: sizeBytes ? Number(sizeBytes) : 0,
    contentBase64: contentBase64 ?? null,
    googleSheetUrl: googleSheetUrl ?? null,
    description: description ?? null,
    createdById: authUser.userId,
  }).returning();
  await createAuditLog({ action: "create", entityType: "document", entityId: file.id, entityRef: file.name, userId: authUser.userId });
  res.status(201).json(fileDto(file));
});

router.patch("/documents/:id", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const id = Number(req.params.id);
  const { name, folderId, description, googleSheetUrl } = req.body;
  const [file] = await db.update(documentFilesTable).set({
    ...(name ? { name } : {}),
    ...(folderId !== undefined ? { folderId: folderId ? Number(folderId) : null } : {}),
    ...(description !== undefined ? { description: description || null } : {}),
    ...(googleSheetUrl !== undefined ? { googleSheetUrl: googleSheetUrl || null } : {}),
  }).where(eq(documentFilesTable.id, id)).returning();
  if (!file) { res.status(404).json({ error: "Document not found" }); return; }
  await createAuditLog({ action: "update", entityType: "document", entityId: file.id, entityRef: file.name, userId: authUser.userId });
  res.json(fileDto(file));
});

router.delete("/documents/:id", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const id = Number(req.params.id);
  await db.delete(documentFilesTable).where(eq(documentFilesTable.id, id));
  await createAuditLog({ action: "delete", entityType: "document", entityId: id, userId: authUser.userId });
  res.sendStatus(204);
});

router.get("/documents/:id/content", authMiddleware, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [file] = await db.select().from(documentFilesTable).where(eq(documentFilesTable.id, id)).limit(1);
  if (!file || !file.contentBase64) { res.status(404).json({ error: "File content not found" }); return; }
  const buffer = Buffer.from(file.contentBase64, "base64");
  res.setHeader("Content-Type", file.mimeType ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.fileName ?? file.name)}"`);
  res.send(buffer);
});

router.get("/documents/:id/download", authMiddleware, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [file] = await db.select().from(documentFilesTable).where(eq(documentFilesTable.id, id)).limit(1);
  if (!file || !file.contentBase64) { res.status(404).json({ error: "File content not found" }); return; }
  const buffer = Buffer.from(file.contentBase64, "base64");
  res.setHeader("Content-Type", file.mimeType ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.fileName ?? file.name)}"`);
  res.send(buffer);
});

export default router;
