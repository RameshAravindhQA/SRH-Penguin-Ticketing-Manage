import { Router } from "express";
import { q, qRaw } from "@workspace/db";
import { authMiddleware } from "../lib/auth";

const router = Router();

function paramId(value: string | string[]): number {
  return parseInt(Array.isArray(value) ? value[0] : value, 10);
}

router.get("/categories", authMiddleware, async (_req, res): Promise<void> => {
  const cats = await q`SELECT * FROM categories`;
  res.json(cats.map((c: any) => ({ id: c.id, name: c.name, type: c.type, description: c.description ?? null, createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt })));
});

router.post("/categories", authMiddleware, async (req, res): Promise<void> => {
  const { name, type, description } = req.body;
  if (!name || !type) { res.status(400).json({ error: "Name and type required" }); return; }
  const [cat] = await q`INSERT INTO categories (name, type, description, status, created_at, updated_at) OUTPUT INSERTED.* VALUES (${name}, ${type}, ${description ?? null}, 'active', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  res.status(201).json({ id: cat.id, name: cat.name, type: cat.type, description: cat.description ?? null, createdAt: cat.createdAt instanceof Date ? cat.createdAt.toISOString() : cat.createdAt });
});

router.patch("/categories/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const { name, type, description } = req.body;
  const sets: string[] = ["updated_at = SYSDATETIMEOFFSET()"];
  const params: Record<string, any> = { id };
  if (name) { sets.push("name = @name"); params.name = name; }
  if (type) { sets.push("type = @type"); params.type = type; }
  if (description != null) { sets.push("description = @desc"); params.desc = description; }
  const [cat] = await qRaw(`UPDATE categories SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id`, params);
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  res.json({ id: cat.id, name: cat.name, type: cat.type, description: cat.description ?? null, createdAt: cat.createdAt instanceof Date ? cat.createdAt.toISOString() : cat.createdAt });
});

router.delete("/categories/:id", authMiddleware, async (req, res): Promise<void> => {
  await q`DELETE FROM categories WHERE id = ${paramId(req.params.id)}`;
  res.sendStatus(204);
});

router.get("/ticket-types", authMiddleware, async (_req, res): Promise<void> => {
  const types = await q`SELECT * FROM ticket_types`;
  res.json(types.map((t: any) => ({ id: t.id, name: t.name, code: t.code, description: t.description ?? null, createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt })));
});

router.post("/ticket-types", authMiddleware, async (req, res): Promise<void> => {
  const { name, code, description } = req.body;
  if (!name || !code) { res.status(400).json({ error: "Name and code required" }); return; }
  const [type] = await q`INSERT INTO ticket_types (name, code, description, status, created_at, updated_at) OUTPUT INSERTED.* VALUES (${name}, ${code}, ${description ?? null}, 'active', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  res.status(201).json({ id: type.id, name: type.name, code: type.code, description: type.description ?? null, createdAt: type.createdAt instanceof Date ? type.createdAt.toISOString() : type.createdAt });
});

router.patch("/ticket-types/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const { name, code, description } = req.body;
  const sets: string[] = ["updated_at = SYSDATETIMEOFFSET()"];
  const params: Record<string, any> = { id };
  if (name) { sets.push("name = @name"); params.name = name; }
  if (code) { sets.push("code = @code"); params.code = code; }
  if (description != null) { sets.push("description = @desc"); params.desc = description; }
  const [type] = await qRaw(`UPDATE ticket_types SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id`, params);
  if (!type) { res.status(404).json({ error: "Ticket type not found" }); return; }
  res.json({ id: type.id, name: type.name, code: type.code, description: type.description ?? null, createdAt: type.createdAt instanceof Date ? type.createdAt.toISOString() : type.createdAt });
});

router.delete("/ticket-types/:id", authMiddleware, async (req, res): Promise<void> => {
  await q`DELETE FROM ticket_types WHERE id = ${paramId(req.params.id)}`;
  res.sendStatus(204);
});

router.get("/sub-categories", authMiddleware, async (_req, res): Promise<void> => {
  const subs = await q`SELECT * FROM sub_categories`;
  const cats = await q`SELECT * FROM categories`;
  const catMap = new Map(cats.map((c: any) => [c.id, c]));
  res.json(subs.map((s: any) => ({
    id: s.id, name: s.name, categoryId: s.categoryId,
    categoryName: (catMap.get(s.categoryId) as any)?.name ?? null,
    type: s.type, description: s.description ?? null,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
  })));
});

router.post("/sub-categories", authMiddleware, async (req, res): Promise<void> => {
  const { name, categoryId, type, description } = req.body;
  if (!name || !categoryId) { res.status(400).json({ error: "Name and category required" }); return; }
  const [sub] = await q`INSERT INTO sub_categories (name, category_id, type, description, created_at, updated_at) OUTPUT INSERTED.* VALUES (${name}, ${categoryId}, ${type ?? "ticket"}, ${description ?? null}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  res.status(201).json({ id: sub.id, name: sub.name, categoryId: sub.categoryId, type: sub.type, description: sub.description ?? null, createdAt: sub.createdAt instanceof Date ? sub.createdAt.toISOString() : sub.createdAt });
});

router.patch("/sub-categories/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = paramId(req.params.id);
  const { name, categoryId, type, description } = req.body;
  const sets: string[] = ["updated_at = SYSDATETIMEOFFSET()"];
  const params: Record<string, any> = { id };
  if (name) { sets.push("name = @name"); params.name = name; }
  if (categoryId) { sets.push("category_id = @catId"); params.catId = categoryId; }
  if (type) { sets.push("type = @type"); params.type = type; }
  if (description != null) { sets.push("description = @desc"); params.desc = description; }
  const [sub] = await qRaw(`UPDATE sub_categories SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE id = @id`, params);
  if (!sub) { res.status(404).json({ error: "Sub category not found" }); return; }
  res.json({ id: sub.id, name: sub.name, categoryId: sub.categoryId, type: sub.type, description: sub.description ?? null, createdAt: sub.createdAt instanceof Date ? sub.createdAt.toISOString() : sub.createdAt });
});

router.delete("/sub-categories/:id", authMiddleware, async (req, res): Promise<void> => {
  await q`DELETE FROM sub_categories WHERE id = ${paramId(req.params.id)}`;
  res.sendStatus(204);
});

export default router;
