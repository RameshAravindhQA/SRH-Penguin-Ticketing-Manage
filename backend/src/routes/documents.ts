import { Router } from "express";
import { q, qRaw } from "@workspace/db";
import { authMiddleware } from "../lib/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const folderDto = (f: any) => ({
  id: f.id, name: f.name, parentId: f.parentId ?? null, description: f.description ?? null,
  createdById: f.createdById,
  createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
  updatedAt: f.updatedAt instanceof Date ? f.updatedAt.toISOString() : f.updatedAt,
});

const fileDto = (f: any) => ({
  id: f.id, folderId: f.folderId ?? null, name: f.name, fileName: f.fileName ?? null,
  mimeType: f.mimeType ?? null, sizeBytes: f.sizeBytes,
  googleSheetUrl: f.googleSheetUrl ?? null, description: f.description ?? null,
  createdById: f.createdById,
  createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
  updatedAt: f.updatedAt instanceof Date ? f.updatedAt.toISOString() : f.updatedAt,
});

router.get("/document-folders", authMiddleware, async (_req, res): Promise<void> => {
  const folders = await q`SELECT * FROM document_folders ORDER BY name ASC`;
  res.json(folders.map(folderDto));
});

router.post("/document-folders", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { name, parentId, description } = req.body;
  if (!name) { res.status(400).json({ error: "Folder name is required" }); return; }
  const [folder] = await q`
    INSERT INTO document_folders (name, parent_id, description, created_by_id, created_at, updated_at)
    OUTPUT INSERTED.*
    VALUES (${name}, ${parentId ? Number(parentId) : null}, ${description ?? null}, ${authUser.userId}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  await createAuditLog({ action: "create", entityType: "document_folder", entityId: (folder as any).id, entityRef: (folder as any).name, userId: authUser.userId });
  res.status(201).json(folderDto(folder));
});

router.patch("/document-folders/:id", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const id = Number(req.params.id);
  const { name, parentId, description } = req.body;
  const sets: string[] = ["updated_at = SYSDATETIMEOFFSET()"];
  const params: Record<string, any> = { id };
  if (name) { sets.push("name = @name"); params.name = name; }
  if (parentId !== undefined) { sets.push("parent_id = @pid"); params.pid = parentId ? Number(parentId) : null; }
  if (description !== undefined) { sets.push("description = @desc"); params.desc = description || null; }
  const [folder] = await qRaw(`UPDATE document_folders SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id`, params);
  if (!folder) { res.status(404).json({ error: "Folder not found" }); return; }
  await createAuditLog({ action: "update", entityType: "document_folder", entityId: folder.id, entityRef: folder.name, userId: authUser.userId });
  res.json(folderDto(folder));
});

router.delete("/document-folders/:id", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const id = Number(req.params.id);
  await q`UPDATE document_files SET folder_id = NULL, updated_at = SYSDATETIMEOFFSET() WHERE folder_id = ${id}`;
  await q`DELETE FROM document_folders WHERE id = ${id}`;
  await createAuditLog({ action: "delete", entityType: "document_folder", entityId: id, userId: authUser.userId });
  res.sendStatus(204);
});

router.get("/documents", authMiddleware, async (req, res): Promise<void> => {
  const folderId = req.query["folderId"] ? Number(req.query["folderId"]) : null;
  const files = folderId
    ? await q`SELECT * FROM document_files WHERE folder_id = ${folderId} ORDER BY created_at DESC`
    : await q`SELECT * FROM document_files ORDER BY created_at DESC`;
  res.json(files.map(fileDto));
});

router.post("/documents", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const { name, folderId, fileName, mimeType, sizeBytes, contentBase64, googleSheetUrl, description } = req.body;
  if (!name) { res.status(400).json({ error: "Document name is required" }); return; }
  if (!googleSheetUrl && !contentBase64) { res.status(400).json({ error: "Attach a file or Google Sheet URL" }); return; }
  if (sizeBytes && Number(sizeBytes) > MAX_DOCUMENT_BYTES) { res.status(400).json({ error: "File must be 10 MB or smaller" }); return; }
  const [file] = await q`
    INSERT INTO document_files (name, folder_id, file_name, mime_type, size_bytes, content_base64, google_sheet_url, description, created_by_id, created_at, updated_at)
    OUTPUT INSERTED.*
    VALUES (${name}, ${folderId ? Number(folderId) : null}, ${fileName ?? null}, ${mimeType ?? null},
            ${sizeBytes ? Number(sizeBytes) : 0}, ${contentBase64 ?? null}, ${googleSheetUrl ?? null},
            ${description ?? null}, ${authUser.userId}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  await createAuditLog({ action: "create", entityType: "document", entityId: (file as any).id, entityRef: (file as any).name, userId: authUser.userId });
  res.status(201).json(fileDto(file));
});

router.patch("/documents/:id", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const id = Number(req.params.id);
  const { name, folderId, description, googleSheetUrl } = req.body;
  const sets: string[] = ["updated_at = SYSDATETIMEOFFSET()"];
  const params: Record<string, any> = { id };
  if (name) { sets.push("name = @name"); params.name = name; }
  if (folderId !== undefined) { sets.push("folder_id = @fid"); params.fid = folderId ? Number(folderId) : null; }
  if (description !== undefined) { sets.push("description = @desc"); params.desc = description || null; }
  if (googleSheetUrl !== undefined) { sets.push("google_sheet_url = @gsu"); params.gsu = googleSheetUrl || null; }
  const [file] = await qRaw(`UPDATE document_files SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id`, params);
  if (!file) { res.status(404).json({ error: "Document not found" }); return; }
  await createAuditLog({ action: "update", entityType: "document", entityId: file.id, entityRef: file.name, userId: authUser.userId });
  res.json(fileDto(file));
});

router.delete("/documents/:id", authMiddleware, async (req, res): Promise<void> => {
  const authUser = (req as any).user;
  const id = Number(req.params.id);
  await q`DELETE FROM document_files WHERE id = ${id}`;
  await createAuditLog({ action: "delete", entityType: "document", entityId: id, userId: authUser.userId });
  res.sendStatus(204);
});

router.get("/documents/:id/content", authMiddleware, async (req, res): Promise<void> => {
  const [file] = await q`SELECT TOP 1 * FROM document_files WHERE id = ${Number(req.params.id)}`;
  if (!file || !(file as any).contentBase64) { res.status(404).json({ error: "File content not found" }); return; }
  const buffer = Buffer.from((file as any).contentBase64, "base64");
  res.setHeader("Content-Type", (file as any).mimeType ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent((file as any).fileName ?? (file as any).name)}"`);
  res.send(buffer);
});

router.get("/documents/:id/download", authMiddleware, async (req, res): Promise<void> => {
  const [file] = await q`SELECT TOP 1 * FROM document_files WHERE id = ${Number(req.params.id)}`;
  if (!file || !(file as any).contentBase64) { res.status(404).json({ error: "File content not found" }); return; }
  const buffer = Buffer.from((file as any).contentBase64, "base64");
  res.setHeader("Content-Type", (file as any).mimeType ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent((file as any).fileName ?? (file as any).name)}"`);
  res.send(buffer);
});

export default router;
