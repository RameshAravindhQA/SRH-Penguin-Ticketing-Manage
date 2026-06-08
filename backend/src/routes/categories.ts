import { Router } from "express";
import { db, categoriesTable, subCategoriesTable, ticketTypesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/categories", authMiddleware, async (req, res): Promise<void> => {
  const cats = await db.select().from(categoriesTable);
  res.json(cats.map(c => ({ id: c.id, name: c.name, type: c.type, description: c.description ?? null, createdAt: c.createdAt.toISOString() })));
});

router.post("/categories", authMiddleware, async (req, res): Promise<void> => {
  const { name, type, description } = req.body;
  if (!name || !type) { res.status(400).json({ error: "Name and type required" }); return; }
  const [cat] = await db.insert(categoriesTable).values({ name, type, description: description ?? null }).returning();
  res.status(201).json({ id: cat.id, name: cat.name, type: cat.type, description: cat.description ?? null, createdAt: cat.createdAt.toISOString() });
});

router.patch("/categories/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, type, description } = req.body;
  const [cat] = await db.update(categoriesTable).set({ ...(name ? { name } : {}), ...(type ? { type } : {}), ...(description != null ? { description } : {}) }).where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  res.json({ id: cat.id, name: cat.name, type: cat.type, description: cat.description ?? null, createdAt: cat.createdAt.toISOString() });
});

router.delete("/categories/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.sendStatus(204);
});

router.get("/ticket-types", authMiddleware, async (_req, res): Promise<void> => {
  const types = await db.select().from(ticketTypesTable);
  res.json(types.map(t => ({ id: t.id, name: t.name, code: t.code, description: t.description ?? null, createdAt: t.createdAt.toISOString() })));
});

router.post("/ticket-types", authMiddleware, async (req, res): Promise<void> => {
  const { name, code, description } = req.body;
  if (!name || !code) { res.status(400).json({ error: "Name and code required" }); return; }
  const [type] = await db.insert(ticketTypesTable).values({ name, code, description: description ?? null }).returning();
  res.status(201).json({ id: type.id, name: type.name, code: type.code, description: type.description ?? null, createdAt: type.createdAt.toISOString() });
});

router.patch("/ticket-types/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, code, description } = req.body;
  const [type] = await db.update(ticketTypesTable).set({ ...(name ? { name } : {}), ...(code ? { code } : {}), ...(description != null ? { description } : {}) }).where(eq(ticketTypesTable.id, id)).returning();
  if (!type) { res.status(404).json({ error: "Ticket type not found" }); return; }
  res.json({ id: type.id, name: type.name, code: type.code, description: type.description ?? null, createdAt: type.createdAt.toISOString() });
});

router.delete("/ticket-types/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(ticketTypesTable).where(eq(ticketTypesTable.id, id));
  res.sendStatus(204);
});

router.get("/sub-categories", authMiddleware, async (_req, res): Promise<void> => {
  const subs = await db.select().from(subCategoriesTable);
  const cats = await db.select().from(categoriesTable);
  const catMap = new Map(cats.map(c => [c.id, c]));
  res.json(subs.map(s => ({
    id: s.id,
    name: s.name,
    categoryId: s.categoryId,
    categoryName: catMap.get(s.categoryId)?.name ?? null,
    type: s.type,
    description: s.description ?? null,
    createdAt: s.createdAt.toISOString(),
  })));
});

router.post("/sub-categories", authMiddleware, async (req, res): Promise<void> => {
  const { name, categoryId, type, description } = req.body;
  if (!name || !categoryId) { res.status(400).json({ error: "Name and category required" }); return; }
  const [sub] = await db.insert(subCategoriesTable).values({ name, categoryId, type: type ?? "ticket", description: description ?? null }).returning();
  res.status(201).json({ id: sub.id, name: sub.name, categoryId: sub.categoryId, type: sub.type, description: sub.description ?? null, createdAt: sub.createdAt.toISOString() });
});

router.patch("/sub-categories/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, categoryId, type, description } = req.body;
  const [sub] = await db.update(subCategoriesTable).set({
    ...(name ? { name } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(type ? { type } : {}),
    ...(description != null ? { description } : {}),
  }).where(eq(subCategoriesTable.id, id)).returning();
  if (!sub) { res.status(404).json({ error: "Sub category not found" }); return; }
  res.json({ id: sub.id, name: sub.name, categoryId: sub.categoryId, type: sub.type, description: sub.description ?? null, createdAt: sub.createdAt.toISOString() });
});

router.delete("/sub-categories/:id", authMiddleware, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(subCategoriesTable).where(eq(subCategoriesTable.id, id));
  res.sendStatus(204);
});

export default router;
