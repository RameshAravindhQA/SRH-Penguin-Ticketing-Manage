import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListTodos, useCreateTodo, useCompleteTodo, useDeleteTodo, getListTodosQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Plus, Search, Calendar, MoreVertical, Trash2, ListTodo } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TableControls, usePagination } from "@/components/shared/TableControls";

function priorityBadge(p: string) {
  const map: Record<string, string> = { high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", low: "bg-green-100 text-green-700" };
  return <Badge className={`border-0 text-[10px] font-bold uppercase ${map[p] || "bg-slate-100 text-slate-600"}`}>{p}</Badge>;
}

function AddTodoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createTodo = useCreateTodo();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", type: "personal", dueDate: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setS = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    createTodo.mutate({ data: { ...form, dueDate: form.dueDate || undefined } }, {
      onSuccess: () => {
        toast.success("Task created");
        qc.invalidateQueries({ queryKey: getListTodosQueryKey() });
        onOpenChange(false);
        setForm({ title: "", description: "", priority: "medium", type: "personal", dueDate: "" });
      },
      onError: () => toast.error("Failed to create task"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add New Task</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>Title <span className="text-red-500">*</span></Label><Input value={form.title} onChange={set("title")} placeholder="Task title" /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={set("description")} placeholder="Optional details..." className="min-h-[80px]" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={setS("priority")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={setS("type")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={set("dueDate")} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createTodo.isPending}>{createTodo.isPending ? "Creating..." : "Add Task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TodosPage() {
  const [activeTab, setActiveTab] = useState("personal");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const { data: todos, isLoading } = useListTodos({ type: activeTab });
  const completeTodo = useCompleteTodo();
  const deleteTodo = useDeleteTodo();
  const qc = useQueryClient();
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const filtered = useMemo(() => {
    let data = todos || [];
    if (statusFilter !== "all") data = data.filter(t => t.status === statusFilter);
    if (priorityFilter !== "all") data = data.filter(t => t.priority === priorityFilter);
    if (search) { const s = search.toLowerCase(); data = data.filter(t => t.title.toLowerCase().includes(s)); }
    return data;
  }, [todos, statusFilter, priorityFilter, search]);

  const paged = paginate(filtered);

  const handleToggle = (id: number, status: string) => {
    completeTodo.mutate({ id, data: { completed: status !== "completed" } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListTodosQueryKey({ type: activeTab }) }),
    });
  };

  const handleDelete = (id: number) => {
    deleteTodo.mutate({ id }, {
      onSuccess: () => { toast.success("Task deleted"); qc.invalidateQueries({ queryKey: getListTodosQueryKey({ type: activeTab }) }); },
      onError: () => toast.error("Failed to delete"),
    });
  };

  const exportData = filtered.map(t => ({
    Title: t.title, Status: t.status, Priority: t.priority, Type: t.type,
    "Due Date": t.dueDate ? format(new Date(t.dueDate), "dd MMM yyyy") : "-",
    "Assigned To": t.assignedToName || "-",
  }));

  return (
    <AppLayout title="To-Do Management">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Task Manager</h2>
            <p className="text-muted-foreground text-sm">Track personal and team action items.</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        </div>

        <Card>
          <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setPage(1); }} className="w-full">
            <div className="border-b px-4 bg-slate-50/50">
              <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0">
                {["personal", "team"].map(tab => (
                  <TabsTrigger key={tab} value={tab} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 h-12 font-semibold text-muted-foreground data-[state=active]:text-primary capitalize">
                    {tab === "personal" ? "Personal Tasks" : "Team Tasks"}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Filters */}
            <div className="px-4 py-3 border-b flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search tasks..." className="pl-9 h-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsContent value={activeTab} className="m-0">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : !paged.length ? (
                  <div className="p-12 flex flex-col items-center text-center">
                    <ListTodo className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
                    <p className="text-muted-foreground">{filtered.length === 0 && (todos || []).length > 0 ? "No tasks match your filters." : "No tasks yet. Add one to get started."}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        {activeTab === "team" && <TableHead>Assigned To</TableHead>}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.map(todo => (
                        <TableRow key={todo.id} className={todo.status === "completed" ? "opacity-60" : ""}>
                          <TableCell>
                            <Checkbox checked={todo.status === "completed"} onCheckedChange={() => handleToggle(todo.id, todo.status)} />
                          </TableCell>
                          <TableCell>
                            <div className={`font-medium text-sm ${todo.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{todo.title}</div>
                            {todo.description && <div className="text-xs text-muted-foreground truncate max-w-[300px]">{todo.description}</div>}
                          </TableCell>
                          <TableCell>{priorityBadge(todo.priority)}</TableCell>
                          <TableCell>
                            <Badge className={`border-0 text-[10px] capitalize ${todo.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                              {todo.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {todo.dueDate ? (
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(todo.dueDate), "dd MMM yyyy")}</span>
                            ) : "-"}
                          </TableCell>
                          {activeTab === "team" && <TableCell className="text-sm">{todo.assignedToName || "-"}</TableCell>}
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-red-600 gap-2" onClick={() => handleDelete(todo.id)}>
                                  <Trash2 className="w-4 h-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              <TableControls
                total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}
                exportData={exportData} exportHeaders={["Title", "Status", "Priority", "Type", "Due Date", "Assigned To"]}
                exportKeys={["Title", "Status", "Priority", "Type", "Due Date", "Assigned To"]}
                exportFilename="todos" exportTitle="Tasks Report"
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
      <AddTodoDialog open={addOpen} onOpenChange={setAddOpen} />
    </AppLayout>
  );
}
