import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Plus, Pencil, Trash2, Palette, Check } from "lucide-react";
import {
  useListDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
  useListRoles, useCreateRole, useUpdateRole, useDeleteRole,
  useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  getListDepartmentsQueryKey, getListRolesQueryKey, getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PRESET_THEMES, applyTheme, loadSavedTheme, AppTheme } from "@/lib/theme";
import { TableControls, usePagination } from "@/components/shared/TableControls";

// ─── Department Tab ──────────────────────────────────────────────────────────
function DepartmentsTab() {
  const { data: depts, isLoading } = useListDepartments();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const openAdd = () => { setEditing(null); setName(""); setDescription(""); setOpen(true); };
  const openEdit = (d: any) => { setEditing(d); setName(d.name); setDescription(d.description || ""); setOpen(true); };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    const invalidate = () => { qc.invalidateQueries({ queryKey: getListDepartmentsQueryKey() }); setOpen(false); };
    if (editing) {
      updateDept.mutate({ id: editing.id, data: { name, description } }, {
        onSuccess: () => { toast.success("Department updated"); invalidate(); },
        onError: () => toast.error("Failed to update"),
      });
    } else {
      createDept.mutate({ data: { name, description } }, {
        onSuccess: () => { toast.success("Department created"); invalidate(); },
        onError: () => toast.error("Failed to create"),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this department?")) return;
    deleteDept.mutate({ id }, {
      onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: getListDepartmentsQueryKey() }); },
      onError: () => toast.error("Failed to delete"),
    });
  };

  const paged = paginate(depts || []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Departments</h3>
          <p className="text-sm text-muted-foreground">{depts?.length || 0} departments configured</p>
        </div>
        <Button size="sm" className="gap-2" onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add Department
        </Button>
      </div>
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !depts?.length ? (
        <div className="py-12 text-center border border-dashed rounded-lg text-muted-foreground">No departments yet. Click "Add Department" to create one.</div>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((d, i) => (
                <TableRow key={d.id}>
                  <TableCell className="text-muted-foreground text-sm">{(page - 1) * pageSize + i + 1}</TableCell>
                  <TableCell className="font-semibold">{d.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{d.description || "-"}</TableCell>
                  <TableCell><Badge variant="secondary">{d.userCount ?? 0}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TableControls total={depts.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} showExport={false} />
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Department" : "Add Department"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name <span className="text-red-500">*</span></Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Information Technology" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Roles Tab ───────────────────────────────────────────────────────────────
function RolesTab() {
  const { data: roles, isLoading } = useListRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("3");
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const openAdd = () => { setEditing(null); setName(""); setDescription(""); setLevel("3"); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setName(r.name); setDescription(r.description || ""); setLevel(String(r.level)); setOpen(true); };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    const invalidate = () => { qc.invalidateQueries({ queryKey: getListRolesQueryKey() }); setOpen(false); };
    if (editing) {
      updateRole.mutate({ id: editing.id, data: { name, description, level: Number(level) } }, {
        onSuccess: () => { toast.success("Role updated"); invalidate(); },
        onError: () => toast.error("Failed to update"),
      });
    } else {
      createRole.mutate({ data: { name, description, level: Number(level) } }, {
        onSuccess: () => { toast.success("Role created"); invalidate(); },
        onError: () => toast.error("Failed to create"),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this role?")) return;
    deleteRole.mutate({ id }, {
      onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: getListRolesQueryKey() }); },
      onError: () => toast.error("Failed to delete"),
    });
  };

  const levelBadge = (lvl: number) => {
    const map: Record<number, string> = { 1: "bg-red-100 text-red-700", 2: "bg-orange-100 text-orange-700", 3: "bg-blue-100 text-blue-700", 4: "bg-slate-100 text-slate-700" };
    const labels: Record<number, string> = { 1: "Admin", 2: "Lead", 3: "Member", 4: "Viewer" };
    return <Badge className={`text-[10px] font-bold ${map[lvl] || map[3]}`}>{labels[lvl] || `L${lvl}`}</Badge>;
  };

  const paged = paginate(roles || []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Roles & Permissions</h3>
          <p className="text-sm text-muted-foreground">{roles?.length || 0} roles configured</p>
        </div>
        <Button size="sm" className="gap-2" onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add Role
        </Button>
      </div>
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !roles?.length ? (
        <div className="py-12 text-center border border-dashed rounded-lg text-muted-foreground">No roles yet.</div>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground text-sm">{(page - 1) * pageSize + i + 1}</TableCell>
                  <TableCell className="font-semibold">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{r.description || "-"}</TableCell>
                  <TableCell>{levelBadge(r.level ?? 3)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TableControls total={roles.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} showExport={false} />
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Role" : "Add Role"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name <span className="text-red-500">*</span></Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Team Lead" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" /></div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <select className="w-full h-9 rounded-md border px-3 text-sm bg-background" value={level} onChange={e => setLevel(e.target.value)}>
                <option value="1">1 — Administrator</option>
                <option value="2">2 — Team Lead</option>
                <option value="3">3 — Member</option>
                <option value="4">4 — Viewer</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Categories Tab ──────────────────────────────────────────────────────────
function CategoriesTab() {
  const { data: cats, isLoading } = useListCategories();
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("ticket");
  const [description, setDescription] = useState("");
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const openAdd = () => { setEditing(null); setName(""); setType("ticket"); setDescription(""); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setName(c.name); setType(c.type); setDescription(c.description || ""); setOpen(true); };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    const invalidate = () => { qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); setOpen(false); };
    if (editing) {
      updateCat.mutate({ id: editing.id, data: { name, type, description } }, {
        onSuccess: () => { toast.success("Category updated"); invalidate(); },
        onError: () => toast.error("Failed to update"),
      });
    } else {
      createCat.mutate({ data: { name, type, description } }, {
        onSuccess: () => { toast.success("Category created"); invalidate(); },
        onError: () => toast.error("Failed to create"),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this category?")) return;
    deleteCat.mutate({ id }, {
      onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); },
      onError: () => toast.error("Failed to delete"),
    });
  };

  const paged = paginate(cats || []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Ticket Categories</h3>
          <p className="text-sm text-muted-foreground">{cats?.length || 0} categories configured</p>
        </div>
        <Button size="sm" className="gap-2" onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !cats?.length ? (
        <div className="py-12 text-center border border-dashed rounded-lg text-muted-foreground">No categories yet.</div>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="text-muted-foreground text-sm">{(page - 1) * pageSize + i + 1}</TableCell>
                  <TableCell className="font-semibold">{c.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{c.type}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{c.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TableControls total={cats.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} showExport={false} />
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name <span className="text-red-500">*</span></Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hardware" /></div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select className="w-full h-9 rounded-md border px-3 text-sm bg-background" value={type} onChange={e => setType(e.target.value)}>
                <option value="ticket">Ticket</option>
                <option value="project">Project</option>
                <option value="general">General</option>
              </select>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Appearance Tab ──────────────────────────────────────────────────────────
function AppearanceTab() {
  const savedTheme = (() => {
    try { return JSON.parse(localStorage.getItem("app_theme") || "null"); } catch { return null; }
  })();
  const [selected, setSelected] = useState<AppTheme>(savedTheme || PRESET_THEMES[0]);

  const handleApply = (theme: AppTheme) => {
    setSelected(theme);
    applyTheme(theme);
    toast.success(`Theme "${theme.name}" applied`);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-foreground">Appearance & Theme</h3>
        <p className="text-sm text-muted-foreground">Customize the color palette across the entire application. Changes are saved automatically.</p>
      </div>
      <div>
        <Label className="text-sm font-semibold mb-3 block">Color Themes</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {PRESET_THEMES.map(theme => {
            const isActive = selected.name === theme.name;
            const primaryStyle = { backgroundColor: `hsl(${theme.primaryHsl})` };
            const sidebarStyle = { backgroundColor: `hsl(${theme.sidebarHsl})` };
            return (
              <button
                key={theme.name}
                onClick={() => handleApply(theme)}
                className={`relative flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${isActive ? "border-primary shadow-md" : "border-slate-200 hover:border-slate-300"}`}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="flex gap-1.5">
                  <div className="w-8 h-8 rounded-md shadow-sm" style={primaryStyle} />
                  <div className="w-8 h-8 rounded-md shadow-sm" style={sidebarStyle} />
                  <div className="w-8 h-8 rounded-md shadow-sm border" style={{ backgroundColor: `hsl(${theme.backgroundHsl})` }} />
                </div>
                <span className="text-sm font-semibold text-foreground">{theme.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded-lg border bg-slate-50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Active theme:</strong> {selected.name}. Theme settings are stored in your browser and persist across sessions.
        </p>
      </div>
    </div>
  );
}

// ─── Main Settings Page ──────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <AppLayout title="Settings">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-muted-foreground" />
            System Configuration
          </h2>
          <p className="text-muted-foreground text-sm">Manage global settings, master data, and appearance.</p>
        </div>

        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <Tabs defaultValue="departments" className="w-full">
            <div className="border-b px-4 bg-slate-50/50">
              <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0 gap-0">
                {["departments", "roles", "categories", "appearance"].map(tab => (
                  <TabsTrigger key={tab} value={tab} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 h-12 font-semibold text-muted-foreground data-[state=active]:text-primary capitalize">
                    {tab === "appearance" ? <span className="flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" />{tab}</span> : tab === "roles" ? "Roles & Permissions" : tab === "categories" ? "Ticket Categories" : tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="departments" className="m-0"><DepartmentsTab /></TabsContent>
            <TabsContent value="roles" className="m-0"><RolesTab /></TabsContent>
            <TabsContent value="categories" className="m-0"><CategoriesTab /></TabsContent>
            <TabsContent value="appearance" className="m-0"><AppearanceTab /></TabsContent>
          </Tabs>
        </Card>
      </div>
    </AppLayout>
  );
}
