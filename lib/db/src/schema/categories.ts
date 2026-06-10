export type Category = {
  id: number;
  name: string;
  type: string;
  description: string | null;
  status: string;
  orderBy: number | null;
  legacyCategoryType: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TicketType = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: string;
  orderBy: number | null;
  legacyType: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SubCategory = {
  id: number;
  name: string;
  categoryId: number;
  type: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertCategory = Omit<Category, "id" | "createdAt" | "updatedAt">;
