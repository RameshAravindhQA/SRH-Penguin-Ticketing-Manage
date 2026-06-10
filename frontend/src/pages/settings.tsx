import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Plus, Pencil, Trash2, Palette, Check, Bell, MessageSquare, Mail, CalendarClock, Monitor, Search, ShieldCheck, RotateCcw } from "lucide-react";
import {
  useListDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
  useListRoles, useCreateRole, useUpdateRole, useDeleteRole,
  useListUsers, useUpdateUser,
  useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  getListDepartmentsQueryKey, getListRolesQueryKey, getListUsersQueryKey, getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PRESET_THEMES, applyTheme, loadSavedTheme, AppTheme } from "@/lib/theme";
import { PERMISSION_GROUPS, permissionLabel, togglePermission } from "@/lib/rbac";
import { TableControls, usePagination } from "@/components/shared/TableControls";
import { getNotificationPreferences, updateNotificationPreferences, NotificationPreferences, NotificationPreferenceUpdate } from "@/lib/notificationPreferences";
import {
  createSubCategory,
  createTicketType,
  deleteSubCategory,
  deleteTicketType,
  listSubCategories,
  listTicketTypes,
  SubCategoryMaster,
  TicketTypeMaster,
  updateSubCategory,
  updateTicketType,
} from "@/lib/master-data";
import { useConfirmation } from "@/components/shared/ConfirmationProvider";

// ─── Department Tab ──────────────────────────────────────────────────────────
function DepartmentsTab() {
  const confirm = useConfirmation();
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

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: "Delete department?",
      description: "This department will be removed from settings.",
      confirmText: "Delete Department",
      variant: "destructive",
    });
    if (!confirmed) return;
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
  const confirm = useConfirmation();
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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionSearch, setPermissionSearch] = useState("");
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const openAdd = () => { setEditing(null); setName(""); setDescription(""); setLevel("3"); setPermissions([]); setPermissionSearch(""); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setName(r.name); setDescription(r.description || ""); setLevel(String(r.level)); setPermissions(r.permissions || []); setPermissionSearch(""); setOpen(true); };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    const invalidate = () => { qc.invalidateQueries({ queryKey: getListRolesQueryKey() }); setOpen(false); };
    const payload = { name, description, level: Number(level), ...(permissions.length ? { permissions } : {}) };
    if (editing) {
      updateRole.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { toast.success("Role updated"); invalidate(); },
        onError: () => toast.error("Failed to update"),
      });
    } else {
      createRole.mutate({ data: payload }, {
        onSuccess: () => { toast.success("Role created"); invalidate(); },
        onError: () => toast.error("Failed to create"),
      });
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: "Delete role?",
      description: "This role will be removed from settings.",
      confirmText: "Delete Role",
      variant: "destructive",
    });
    if (!confirmed) return;
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

  const filteredGroups = PERMISSION_GROUPS.map(group => ({
    ...group,
    permissions: group.permissions.filter(permission => {
      const search = permissionSearch.trim().toLowerCase();
      if (!search) return true;
      return group.title.toLowerCase().includes(search) || permissionLabel(permission).toLowerCase().includes(search) || permission.toLowerCase().includes(search);
    }),
  })).filter(group => group.permissions.length > 0);

  const allVisiblePermissions = filteredGroups.flatMap(group => [...group.permissions]);
  const selectedVisibleCount = allVisiblePermissions.filter(permission => permissions.includes(permission)).length;

  const updateGroupPermissions = (groupPermissions: readonly string[], checked: boolean) => {
    setPermissions(current => {
      const next = new Set(current);
      groupPermissions.forEach(permission => {
        if (checked) next.add(permission);
        else next.delete(permission);
      });
      return [...next];
    });
  };

  const toggleAllVisible = () => {
    const shouldSelectAll = selectedVisibleCount !== allVisiblePermissions.length;
    updateGroupPermissions(allVisiblePermissions, shouldSelectAll);
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
                <TableHead>Permissions</TableHead>
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
                  <TableCell><Badge variant="secondary" className="text-xs">{r.permissions?.length ?? 0}</Badge></TableCell>
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
        <DialogContent className="!flex max-h-[96dvh] max-w-[min(1080px,calc(100vw-1rem))] flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6 sm:py-5">
            <DialogTitle>{editing ? "Edit Role" : "Add Role"}</DialogTitle>
            <DialogDescription>
              Configure the role profile and choose explicit RBAC permissions. Leave permissions empty to use the default set for the selected level.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:overflow-hidden">
            <div className="space-y-4 border-b bg-slate-50/70 p-4 sm:p-6 lg:border-b-0 lg:border-r lg:overflow-y-auto">
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Permission mode</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {permissions.length ? `${permissions.length} explicit permission${permissions.length === 1 ? "" : "s"} selected.` : "Using level defaults until one permission is selected."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role-name">Name <span className="text-red-500">*</span></Label>
                <Input id="role-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Team Lead" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-description">Description</Label>
                <Input id="role-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-level">Level</Label>
                <select id="role-level" className="h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={level} onChange={e => setLevel(e.target.value)}>
                  <option value="1">1 - Administrator</option>
                  <option value="2">2 - Team Lead</option>
                  <option value="3">3 - Member</option>
                  <option value="4">4 - Viewer</option>
                </select>
              </div>
              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setPermissions([])} disabled={!permissions.length}>
                <RotateCcw className="h-4 w-4" />
                Use Level Defaults
              </Button>
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="shrink-0 border-b bg-background px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Role Permissions</Label>
                    <p className="text-xs text-muted-foreground">Grouped by module for faster review and keyboard navigation.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={toggleAllVisible} disabled={!allVisiblePermissions.length}>
                    {selectedVisibleCount === allVisiblePermissions.length && allVisiblePermissions.length ? "Clear Visible" : "Select Visible"}
                  </Button>
                </div>
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={permissionSearch}
                    onChange={e => setPermissionSearch(e.target.value)}
                    className="pl-9"
                    placeholder="Search permissions or modules"
                    aria-label="Search permissions"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-visible p-4 sm:p-6 lg:overflow-y-auto">
                {filteredGroups.length ? filteredGroups.map(group => {
                  const selectedCount = group.permissions.filter(permission => permissions.includes(permission)).length;
                  const allSelected = selectedCount === group.permissions.length;
                  return (
                    <section key={group.title} aria-labelledby={`permission-group-${group.title}`} className="rounded-lg border bg-background">
                      <div className="flex flex-col gap-3 border-b bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 id={`permission-group-${group.title}`} className="text-sm font-semibold text-foreground">{group.title}</h4>
                          <p className="text-xs text-muted-foreground">{selectedCount} of {group.permissions.length} selected</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => updateGroupPermissions(group.permissions, !allSelected)}>
                          {allSelected ? "Clear group" : "Select group"}
                        </Button>
                      </div>
                      <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
                        {group.permissions.map(permission => {
                          const checked = permissions.includes(permission);
                          return (
                            <label
                              key={permission}
                              className="flex min-h-12 cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm transition hover:border-primary/40 hover:bg-primary/5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => setPermissions(togglePermission(permissions, permission))}
                                aria-label={permissionLabel(permission)}
                                className="mt-0.5 h-5 w-5"
                              />
                              <span className="min-w-0 leading-5">
                                <span className="block font-medium text-foreground">{permissionLabel(permission)}</span>
                                <span className="block break-words font-mono text-[11px] text-muted-foreground">{permission}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  );
                }) : (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No permissions match your search.
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t bg-background px-4 py-4 sm:px-6">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserPermissionsTab() {
  const { data: users, isLoading } = useListUsers();
  const updateUser = useUpdateUser();
  const qc = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionSearch, setPermissionSearch] = useState("");

  const filteredUsers = (users || []).filter(user => {
    const search = userSearch.trim().toLowerCase();
    if (!search) return true;
    return user.name.toLowerCase().includes(search)
      || user.email.toLowerCase().includes(search)
      || user.employeeCode.toLowerCase().includes(search)
      || user.role.toLowerCase().includes(search);
  });
  const selectedUser = (users || []).find(user => user.id === selectedUserId) || null;

  useEffect(() => {
    if (!selectedUser) {
      if (!selectedUserId && users?.length) setSelectedUserId(users[0].id);
      return;
    }
    setPermissions(selectedUser.permissions || []);
  }, [selectedUserId, selectedUser, users]);

  const filteredGroups = PERMISSION_GROUPS.map(group => ({
    ...group,
    permissions: group.permissions.filter(permission => {
      const search = permissionSearch.trim().toLowerCase();
      if (!search) return true;
      return group.title.toLowerCase().includes(search) || permissionLabel(permission).toLowerCase().includes(search) || permission.toLowerCase().includes(search);
    }),
  })).filter(group => group.permissions.length > 0);

  const visiblePermissions = filteredGroups.flatMap(group => [...group.permissions]);
  const selectedVisibleCount = visiblePermissions.filter(permission => permissions.includes(permission)).length;
  const hasChanges = !!selectedUser && JSON.stringify([...(selectedUser.permissions || [])].sort()) !== JSON.stringify([...permissions].sort());

  const updateGroupPermissions = (groupPermissions: readonly string[], checked: boolean) => {
    setPermissions(current => {
      const next = new Set(current);
      groupPermissions.forEach(permission => {
        if (checked) next.add(permission);
        else next.delete(permission);
      });
      return [...next];
    });
  };

  const toggleVisiblePermissions = () => {
    updateGroupPermissions(visiblePermissions, selectedVisibleCount !== visiblePermissions.length);
  };

  const savePermissions = () => {
    if (!selectedUser) return;
    updateUser.mutate({ id: selectedUser.id, data: { permissions } }, {
      onSuccess: () => {
        toast.success("User permissions updated");
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: () => toast.error("Failed to update user permissions"),
    });
  };

  return (
    <div className="grid min-h-[620px] gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-b bg-slate-50/70 p-4 sm:p-6 lg:border-b-0 lg:border-r">
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground">User-wise Permissions</h3>
          <p className="text-sm text-muted-foreground">Select an employee and assign direct custom RBAC permissions.</p>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={userSearch} onChange={event => setUserSearch(event.target.value)} className="pl-9" placeholder="Search users" aria-label="Search users" />
        </div>
        <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">Loading users...</div>
          ) : filteredUsers.length ? filteredUsers.map(user => {
            const selected = user.id === selectedUserId;
            return (
              <button key={user.id} type="button" onClick={() => setSelectedUserId(user.id)} className={`w-full rounded-lg border p-3 text-left transition ${selected ? "border-primary bg-primary/5" : "border-slate-200 bg-background hover:border-primary/40"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.employeeCode} - {user.email}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">{user.role.replace("_", " ")}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{user.permissions?.length || 0} custom permissions</p>
              </button>
            );
          }) : (
            <div className="rounded-lg border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">No users found.</div>
          )}
        </div>
      </aside>

      <section className="min-w-0 p-4 sm:p-6">
        {selectedUser ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-background p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{selectedUser.name}</p>
                <p className="truncate text-sm text-muted-foreground">{selectedUser.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">{permissions.length} direct custom permission{permissions.length === 1 ? "" : "s"} selected</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setPermissions([])} disabled={!permissions.length || updateUser.isPending}>Clear Custom</Button>
                <Button type="button" onClick={savePermissions} disabled={!hasChanges || updateUser.isPending}>{updateUser.isPending ? "Saving..." : "Save Permissions"}</Button>
              </div>
            </div>

            <div className="rounded-lg border bg-slate-50 p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Label className="text-sm font-semibold">Custom Permission Matrix</Label>
                  <p className="text-xs text-muted-foreground">These permissions are added to the user's role-based access.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={toggleVisiblePermissions} disabled={!visiblePermissions.length}>
                  {selectedVisibleCount === visiblePermissions.length && visiblePermissions.length ? "Clear Visible" : "Select Visible"}
                </Button>
              </div>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={permissionSearch} onChange={event => setPermissionSearch(event.target.value)} className="pl-9" placeholder="Search permissions or modules" aria-label="Search user custom permissions" />
              </div>
              <div className="mt-4 space-y-4">
                {filteredGroups.length ? filteredGroups.map(group => {
                  const selectedCount = group.permissions.filter(permission => permissions.includes(permission)).length;
                  const allSelected = selectedCount === group.permissions.length;
                  return (
                    <div key={group.title} className="overflow-hidden rounded-lg border bg-white">
                      <div className="flex flex-col gap-3 border-b bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{group.title}</p>
                          <p className="text-xs text-muted-foreground">{selectedCount} of {group.permissions.length} selected</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => updateGroupPermissions(group.permissions, !allSelected)}>{allSelected ? "Clear group" : "Select group"}</Button>
                      </div>
                      <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                        {group.permissions.map(permission => (
                          <label key={permission} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm transition hover:border-primary/40 hover:bg-primary/5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                            <Checkbox checked={permissions.includes(permission)} onCheckedChange={() => setPermissions(togglePermission(permissions, permission))} aria-label={permissionLabel(permission)} className="mt-0.5 h-5 w-5" />
                            <span className="min-w-0 leading-5">
                              <span className="block font-medium text-foreground">{permissionLabel(permission)}</span>
                              <span className="block break-words font-mono text-[11px] text-muted-foreground">{permission}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">No permissions match your search.</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Select a user to manage custom permissions.</div>
        )}
      </section>
    </div>
  );
}

// ─── Categories Tab ──────────────────────────────────────────────────────────
function CategoriesTab() {
  const confirm = useConfirmation();
  const { data: cats, isLoading } = useListCategories();
  const { data: ticketTypes, isLoading: typesLoading } = useQuery({ queryKey: ["ticket-types"], queryFn: listTicketTypes });
  const { data: subCategories, isLoading: subsLoading } = useQuery({ queryKey: ["sub-categories"], queryFn: listSubCategories });
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();
  const createType = useMutation({ mutationFn: createTicketType });
  const updateType = useMutation({ mutationFn: ({ id, data }: { id: number; data: any }) => updateTicketType(id, data) });
  const deleteType = useMutation({ mutationFn: deleteTicketType });
  const createSub = useMutation({ mutationFn: createSubCategory });
  const updateSub = useMutation({ mutationFn: ({ id, data }: { id: number; data: any }) => updateSubCategory(id, data) });
  const deleteSub = useMutation({ mutationFn: deleteSubCategory });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("ticket");
  const [description, setDescription] = useState("");
  const [typeOpen, setTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<TicketTypeMaster | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeCode, setTypeCode] = useState("");
  const [typeDescription, setTypeDescription] = useState("");
  const [subOpen, setSubOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubCategoryMaster | null>(null);
  const [subName, setSubName] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [subType, setSubType] = useState("ticket");
  const [subDescription, setSubDescription] = useState("");
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const openAdd = () => { setEditing(null); setName(""); setType("ticket"); setDescription(""); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setName(c.name); setType(c.type); setDescription(c.description || ""); setOpen(true); };
  const openAddType = () => { setEditingType(null); setTypeName(""); setTypeCode(""); setTypeDescription(""); setTypeOpen(true); };
  const openEditType = (t: TicketTypeMaster) => { setEditingType(t); setTypeName(t.name); setTypeCode(t.code); setTypeDescription(t.description || ""); setTypeOpen(true); };
  const openAddSub = () => { setEditingSub(null); setSubName(""); setSubCategoryId(cats?.[0]?.id ? String(cats[0].id) : ""); setSubType("ticket"); setSubDescription(""); setSubOpen(true); };
  const openEditSub = (s: SubCategoryMaster) => { setEditingSub(s); setSubName(s.name); setSubCategoryId(String(s.categoryId)); setSubType(s.type); setSubDescription(s.description || ""); setSubOpen(true); };

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

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: "Delete category?",
      description: "This category will be removed from settings.",
      confirmText: "Delete Category",
      variant: "destructive",
    });
    if (!confirmed) return;
    deleteCat.mutate({ id }, {
      onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); },
      onError: () => toast.error("Failed to delete"),
    });
  };

  const handleSaveType = () => {
    if (!typeName.trim() || !typeCode.trim()) { toast.error("Type name and code are required"); return; }
    const data = { name: typeName.trim(), code: typeCode.trim(), description: typeDescription };
    const onSuccess = () => { toast.success(editingType ? "Ticket type updated" : "Ticket type created"); qc.invalidateQueries({ queryKey: ["ticket-types"] }); setTypeOpen(false); };
    if (editingType) updateType.mutate({ id: editingType.id, data }, { onSuccess, onError: () => toast.error("Failed to save ticket type") });
    else createType.mutate(data, { onSuccess, onError: () => toast.error("Failed to save ticket type") });
  };

  const handleDeleteType = async (id: number) => {
    const confirmed = await confirm({
      title: "Delete ticket type?",
      description: "This ticket type will be removed from settings.",
      confirmText: "Delete Type",
      variant: "destructive",
    });
    if (!confirmed) return;
    deleteType.mutate(id, { onSuccess: () => { toast.success("Ticket type deleted"); qc.invalidateQueries({ queryKey: ["ticket-types"] }); }, onError: () => toast.error("Failed to delete ticket type") });
  };

  const handleSaveSub = () => {
    if (!subName.trim() || !subCategoryId) { toast.error("Sub category name and category are required"); return; }
    const data = { name: subName.trim(), categoryId: Number(subCategoryId), type: subType, description: subDescription };
    const onSuccess = () => { toast.success(editingSub ? "Sub category updated" : "Sub category created"); qc.invalidateQueries({ queryKey: ["sub-categories"] }); setSubOpen(false); };
    if (editingSub) updateSub.mutate({ id: editingSub.id, data }, { onSuccess, onError: () => toast.error("Failed to save sub category") });
    else createSub.mutate(data, { onSuccess, onError: () => toast.error("Failed to save sub category") });
  };

  const handleDeleteSub = async (id: number) => {
    const confirmed = await confirm({
      title: "Delete sub category?",
      description: "This sub category will be removed from settings.",
      confirmText: "Delete Sub Category",
      variant: "destructive",
    });
    if (!confirmed) return;
    deleteSub.mutate(id, { onSuccess: () => { toast.success("Sub category deleted"); qc.invalidateQueries({ queryKey: ["sub-categories"] }); }, onError: () => toast.error("Failed to delete sub category") });
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
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
            <div>
              <CardTitle className="text-base">Ticket Types</CardTitle>
              <CardDescription>Master list used by Raise Ticket and Self Tickets.</CardDescription>
            </div>
            <Button size="sm" className="gap-2" onClick={openAddType}><Plus className="w-4 h-4" /> Add Type</Button>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-auto p-0">
            {typesLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : !ticketTypes?.length ? (
              <div className="p-8 text-center text-muted-foreground">No ticket types yet.</div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticketTypes.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-semibold">{t.name}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{t.code}</Badge></TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">{t.description || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditType(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteType(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
            <div>
              <CardTitle className="text-base">Sub Categories</CardTitle>
              <CardDescription>Child masters linked to ticket and project categories.</CardDescription>
            </div>
            <Button size="sm" className="gap-2" onClick={openAddSub}><Plus className="w-4 h-4" /> Add Sub</Button>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-auto p-0">
            {subsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : !subCategories?.length ? (
              <div className="p-8 text-center text-muted-foreground">No sub categories yet.</div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subCategories.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold">{s.name}</TableCell>
                      <TableCell className="text-sm">{s.categoryName || "-"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{s.type}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSub(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteSub(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
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
      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingType ? "Edit Ticket Type" : "Add Ticket Type"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name <span className="text-red-500">*</span></Label><Input value={typeName} onChange={e => setTypeName(e.target.value)} placeholder="Normal Ticket" /></div>
            <div className="space-y-1.5"><Label>Code <span className="text-red-500">*</span></Label><Input value={typeCode} onChange={e => setTypeCode(e.target.value)} placeholder="normal" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={typeDescription} onChange={e => setTypeDescription(e.target.value)} placeholder="Brief description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveType}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSub ? "Edit Sub Category" : "Add Sub Category"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name <span className="text-red-500">*</span></Label><Input value={subName} onChange={e => setSubName(e.target.value)} placeholder="VPN / License / Desktop" /></div>
            <div className="space-y-1.5">
              <Label>Parent Category <span className="text-red-500">*</span></Label>
              <select className="w-full h-9 rounded-md border px-3 text-sm bg-background" value={subCategoryId} onChange={e => setSubCategoryId(e.target.value)}>
                <option value="">Select category</option>
                {cats?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select className="w-full h-9 rounded-md border px-3 text-sm bg-background" value={subType} onChange={e => setSubType(e.target.value)}>
                <option value="ticket">Ticket</option>
                <option value="project">Project</option>
                <option value="general">General</option>
              </select>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={subDescription} onChange={e => setSubDescription(e.target.value)} placeholder="Brief description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSub}>Save</Button>
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

function IntegrationsTab() {
  const qc = useQueryClient();
  const { data: preferences, isLoading, isError } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: getNotificationPreferences,
  });
  const [form, setForm] = useState<NotificationPreferenceUpdate>({
    inAppEnabled: true,
    spaceEnabled: true,
    mailEnabled: false,
    calendarEnabled: true,
  });

  useEffect(() => {
    if (!preferences) return;
    setForm({
      inAppEnabled: preferences.inAppEnabled,
      spaceEnabled: preferences.spaceEnabled,
      mailEnabled: preferences.mailEnabled,
      calendarEnabled: preferences.calendarEnabled,
    });
  }, [preferences]);

  const updatePreferences = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: data => {
      qc.setQueryData(["notification-preferences"], data);
      toast.success("Notification settings updated");
    },
    onError: () => toast.error("Failed to update notification settings"),
  });

  const toggle = (key: keyof Pick<NotificationPreferences, "inAppEnabled" | "spaceEnabled" | "mailEnabled" | "calendarEnabled">) => {
    if (updatePreferences.isPending) return;
    setForm(current => ({ ...current, [key]: !current[key] }));
  };

  const hasChanges = !!preferences && (
    form.inAppEnabled !== preferences.inAppEnabled ||
    form.spaceEnabled !== preferences.spaceEnabled ||
    form.mailEnabled !== preferences.mailEnabled ||
    form.calendarEnabled !== preferences.calendarEnabled
  );

  const saveChanges = () => {
    updatePreferences.mutate(form);
  };

  const rows = [
    {
      key: "inAppEnabled" as const,
      title: "In-app notifications",
      description: "Show alerts inside the SRH ticketing application.",
      icon: Bell,
    },
    {
      key: "spaceEnabled" as const,
      title: "Google Chat Space",
      description: "Send ticket, project, and todo updates to the configured Google Chat Space.",
      icon: MessageSquare,
    },
    {
      key: "calendarEnabled" as const,
      title: "Google Calendar and Meet",
      description: "Create or update Google Calendar events and Meet links for reminders and meetings.",
      icon: CalendarClock,
    },
    {
      key: "mailEnabled" as const,
      title: "Email notifications",
      description: "Reserve email delivery for future mail integration.",
      icon: Mail,
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Google API & Notifications</h3>
        <p className="text-sm text-muted-foreground">Control which notification channels are active for your account.</p>
      </div>
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Notification settings could not be loaded. Check the backend connection and try again.
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map(row => {
            const Icon = row.icon;
            const enabled = !!form[row.key];
            return (
              <div key={row.key} className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{row.title}</p>
                      <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Active" : "Inactive"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{row.description}</p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  disabled={updatePreferences.isPending || isError}
                  onCheckedChange={() => toggle(row.key)}
                  aria-label={`Toggle ${row.title}`}
                />
              </div>
            );
          })}
        </div>
      )}
      <div className="flex flex-col gap-3 rounded-lg border bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Google Chat and Calendar toggles stop future API calls for those channels. Click Save Changes to apply updates.
        </p>
        <Button
          className="shrink-0"
          disabled={isLoading || isError || updatePreferences.isPending || !hasChanges}
          onClick={saveChanges}
        >
          {updatePreferences.isPending ? "Saving..." : "Save Changes"}
        </Button>
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
          <p className="text-muted-foreground text-sm">Manage global settings, master data, integrations, and appearance.</p>
        </div>

        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <Tabs defaultValue="departments" className="w-full">
            <div className="overflow-x-auto border-b bg-slate-50/50 px-2 sm:px-4">
              <TabsList className="h-12 min-w-max justify-start rounded-none bg-transparent p-0 gap-0">
                {["departments", "roles", "user-permissions", "categories", "integrations", "appearance"].map(tab => (
                  <TabsTrigger key={tab} value={tab} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 sm:px-5 h-12 font-semibold text-muted-foreground data-[state=active]:text-primary capitalize whitespace-nowrap">
                    {tab === "appearance" ? <span className="flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" />{tab}</span> : tab === "integrations" ? <span className="flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" />Google API</span> : tab === "roles" ? "Roles & Permissions" : tab === "user-permissions" ? "User Permissions" : tab === "categories" ? "Ticket Categories" : tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="departments" className="m-0"><DepartmentsTab /></TabsContent>
            <TabsContent value="roles" className="m-0"><RolesTab /></TabsContent>
            <TabsContent value="user-permissions" className="m-0"><UserPermissionsTab /></TabsContent>
            <TabsContent value="categories" className="m-0"><CategoriesTab /></TabsContent>
            <TabsContent value="integrations" className="m-0"><IntegrationsTab /></TabsContent>
            <TabsContent value="appearance" className="m-0"><AppearanceTab /></TabsContent>
          </Tabs>
        </Card>
      </div>
    </AppLayout>
  );
}
