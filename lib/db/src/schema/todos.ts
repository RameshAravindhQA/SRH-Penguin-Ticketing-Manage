export type Todo = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  dueDate: Date | null;
  reminderAt: Date | null;
  assignedToId: number | null;
  createdById: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertTodo = Omit<Todo, "id" | "createdAt" | "updatedAt">;
