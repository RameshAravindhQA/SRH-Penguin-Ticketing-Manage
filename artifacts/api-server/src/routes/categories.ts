import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
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

export default router;
