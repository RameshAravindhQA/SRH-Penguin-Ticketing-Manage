import React, { useState, useMemo, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListUsers, useCreateUser, useDeleteUser, useListDepartments, useListRoles, getListUsersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, MoreHorizontal, Search, Upload, Download, Trash2, FileSpreadsheet, Camera, Users, UserCheck, UserX, ShieldCheck, GitBranch, List, Pencil } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExportMenu, TableControls, usePagination } from "@/components/shared/TableControls";
import { ModuleStats } from "@/components/shared/ModuleStats";
import { permissionLabel, PERMISSION_GROUPS, togglePermission } from "@/lib/rbac";
import { useConfirmation } from "@/components/shared/ConfirmationProvider";
import { downloadCSVTemplate, parseCSVFile, exportToCSV, exportToExcel, exportToPDF } from "@/lib/export";

async function localApiFetch(path: string) {
  const token = localStorage.getItem("auth_token");
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function localApiJson(path: string, init: RequestInit) {
  const token = localStorage.getItem("auth_token");
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return null;
  return response.json();
}

function userFormDefaults(user?: any) {
  return {
    employeeCode: user?.employeeCode || "",
    name: user?.name || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
    departmentId: user?.departmentId ? String(user.departmentId) : "",
    designation: user?.designation || "",
    role: user?.role || "employee",
    roleId: user?.roleId ? String(user.roleId) : "",
    password: "User@123",
    status: user?.status || "active",
    avatarUrl: user?.avatarUrl || "",
    permissions: user?.permissions || [],
  };
}

function EmployeeTree({ nodes }: { nodes: any[] }) {
  if (!nodes?.length) return <div className="p-8 text-center text-muted-foreground">No employees in your reporting tree.</div>;
  return (
    <div className="space-y-3 p-4">
      {nodes.map(node => (
        <div key={node.id} className="rounded-md border bg-white p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={node.avatarUrl || ""} />
              <AvatarFallback className="text-xs">{node.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{node.name}</div>
              <div className="text-xs text-muted-foreground">{node.designation || node.role} - {node.departmentName || "No Department"}</div>
            </div>
          </div>
          {node.children?.length > 0 && (
            <div className="ml-5 mt-3 border-l pl-4">
              <EmployeeTree nodes={node.children} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function statusBadge(status: string) {
  const s = status?.toLowerCase();
  if (s === "active") return <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>;
  if (s === "inactive") return <Badge className="bg-slate-100 text-slate-600 border-0 text-xs">Inactive</Badge>;
  return <Badge variant="secondary" className="text-xs capitalize">{status}</Badge>;
}

function roleBadge(role: string) {
  const map: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    team_lead: "bg-orange-100 text-orange-700",
    manager: "bg-purple-100 text-purple-700",
    employee: "bg-blue-100 text-blue-700",
  };
  return <Badge className={`border-0 text-[10px] uppercase font-bold ${map[role] || "bg-slate-100 text-slate-700"}`}>{role.replace("_", " ")}</Badge>;
}

// ─── Add User Dialog ─────────────────────────────────────────────────────────
function UserDialog({ open, onOpenChange, editingUser }: { open: boolean; onOpenChange: (v: boolean) => void; editingUser?: any }) {
  const createUser = useCreateUser();
  const { data: departments } = useListDepartments();
  const { data: roles } = useListRoles();
  const qc = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(userFormDefaults(editingUser));
  const [avatarPreview, setAvatarPreview] = useState(editingUser?.avatarUrl || "");
  const [updating, setUpdating] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");

  React.useEffect(() => {
    if (!open) return;
    setForm(userFormDefaults(editingUser));
    setAvatarPreview(editingUser?.avatarUrl || "");
    setPermissionSearch("");
  }, [open, editingUser]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setS = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const toggleUserPermission = (permission: string) => setForm(f => ({ ...f, permissions: togglePermission(f.permissions, permission) }));

  const filteredPermissionGroups = PERMISSION_GROUPS.map(group => ({
    ...group,
    permissions: group.permissions.filter(permission => {
      const search = permissionSearch.trim().toLowerCase();
      if (!search) return true;
      return group.title.toLowerCase().includes(search) || permissionLabel(permission).toLowerCase().includes(search) || permission.toLowerCase().includes(search);
    }),
  })).filter(group => group.permissions.length > 0);

  const visiblePermissions = filteredPermissionGroups.flatMap(group => [...group.permissions]);
  const selectedVisibleCount = visiblePermissions.filter(permission => form.permissions.includes(permission)).length;

  const setGroupPermissions = (groupPermissions: readonly string[], checked: boolean) => {
    setForm(current => {
      const next = new Set(current.permissions);
      groupPermissions.forEach(permission => {
        if (checked) next.add(permission);
        else next.delete(permission);
      });
      return { ...current, permissions: [...next] };
    });
  };

  const toggleVisiblePermissions = () => {
    setGroupPermissions(visiblePermissions, selectedVisibleCount !== visiblePermissions.length);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setAvatarPreview(url);
      setForm(f => ({ ...f, avatarUrl: url }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.employeeCode || !form.name || !form.email || !form.role) {
      toast.error("Employee code, name, email and role are required");
      return;
    }
    const payload = {
      ...form,
      departmentId: form.departmentId ? Number(form.departmentId) : undefined,
      roleId: form.roleId ? Number(form.roleId) : undefined,
      avatarUrl: form.avatarUrl || undefined,
    };
    if (editingUser) {
      setUpdating(true);
      localApiJson(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
        .then(() => {
          toast.success("Employee updated successfully");
          qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
          qc.invalidateQueries({ queryKey: ["users-tree"] });
          onOpenChange(false);
        })
        .catch(() => toast.error("Failed to update employee"))
        .finally(() => setUpdating(false));
      return;
    }
    createUser.mutate({
      data: {
        ...payload,
      }
    }, {
      onSuccess: () => {
        toast.success("User created successfully");
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        qc.invalidateQueries({ queryKey: ["users-tree"] });
        onOpenChange(false);
        setForm(userFormDefaults());
        setAvatarPreview("");
      },
      onError: () => toast.error("Failed to create user"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex max-h-[96dvh] max-w-[min(1120px,calc(100vw-1rem))] flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle>{editingUser ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          <DialogDescription>{editingUser ? "Update employee profile, photo, role, and department assignment." : "Create a new employee account with department and role assignment."}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="grid grid-cols-1 gap-5">
          {/* Avatar Upload */}
          <div className="flex flex-col gap-4 rounded-lg border bg-slate-50 p-4 sm:flex-row sm:items-center">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarPreview} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">{form.name ? form.name[0]?.toUpperCase() : "?"}</AvatarFallback>
              </Avatar>
              <button type="button" onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label="Upload profile photo">
                <Camera className="w-3 h-3 text-white" />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Profile Photo</p>
              <p className="text-xs text-muted-foreground">Click the camera icon to upload. JPG, PNG, GIF up to 2MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="user-employee-code">Employee Code <span className="text-red-500">*</span></Label><Input id="user-employee-code" value={form.employeeCode} onChange={set("employeeCode")} placeholder="EMP-007" disabled={!!editingUser} /></div>
            <div className="space-y-1.5"><Label htmlFor="user-name">Full Name <span className="text-red-500">*</span></Label><Input id="user-name" value={form.name} onChange={set("name")} placeholder="John Smith" /></div>
            <div className="space-y-1.5"><Label htmlFor="user-email">Email <span className="text-red-500">*</span></Label><Input id="user-email" type="email" value={form.email} onChange={set("email")} placeholder="john@company.com" /></div>
            <div className="space-y-1.5"><Label htmlFor="user-mobile">Mobile</Label><Input id="user-mobile" value={form.mobile} onChange={set("mobile")} placeholder="+91 9000000000" /></div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={setS("departmentId")}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments?.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="user-designation">Designation</Label><Input id="user-designation" value={form.designation} onChange={set("designation")} placeholder="Senior Developer" /></div>
            <div className="space-y-1.5">
              <Label>System Role <span className="text-red-500">*</span></Label>
              <Select value={form.role} onValueChange={setS("role")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.roleId} onValueChange={setS("roleId")}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{roles?.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="user-password">Password</Label><Input id="user-password" type="password" value={form.password} onChange={set("password")} /></div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={setS("status")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <section className="space-y-4 rounded-lg border bg-slate-50 p-3 sm:p-4" aria-labelledby="user-custom-permissions">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1">
                <Label id="user-custom-permissions" className="text-sm font-semibold">User-wise Custom Permissions</Label>
                <p className="text-xs text-muted-foreground">
                  Add direct permissions for this employee in addition to their role-based access. Leave empty to use role access only.
                </p>
                <p className="text-xs font-medium text-foreground">{form.permissions.length} custom permission{form.permissions.length === 1 ? "" : "s"} selected</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, permissions: [] }))} disabled={!form.permissions.length}>
                  Clear Custom
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={toggleVisiblePermissions} disabled={!visiblePermissions.length}>
                  {selectedVisibleCount === visiblePermissions.length && visiblePermissions.length ? "Clear Visible" : "Select Visible"}
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={permissionSearch}
                onChange={e => setPermissionSearch(e.target.value)}
                className="pl-9"
                placeholder="Search permissions or modules"
                aria-label="Search user permissions"
              />
            </div>
            <div className="space-y-4">
              {filteredPermissionGroups.length ? filteredPermissionGroups.map(group => {
                const selectedCount = group.permissions.filter(permission => form.permissions.includes(permission)).length;
                const allSelected = selectedCount === group.permissions.length;
                return (
                  <div key={group.title} className="overflow-hidden rounded-lg border bg-white">
                    <div className="flex flex-col gap-3 border-b bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{group.title}</div>
                        <div className="text-xs text-muted-foreground">{selectedCount} of {group.permissions.length} selected</div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setGroupPermissions(group.permissions, !allSelected)}>
                        {allSelected ? "Clear group" : "Select group"}
                      </Button>
                    </div>
                    <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                      {group.permissions.map(permission => {
                        const checked = form.permissions.includes(permission);
                        return (
                          <label
                            key={permission}
                            className="flex min-h-12 cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm transition hover:border-primary/40 hover:bg-primary/5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleUserPermission(permission)}
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
                  </div>
                );
              }) : (
                <div className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">
                  No permissions match your search.
                </div>
              )}
            </div>
          </section>
        </div>
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t px-4 py-4 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createUser.isPending || updating}>{createUser.isPending || updating ? "Saving..." : editingUser ? "Save Employee" : "Create Employee"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Import Dialog ───────────────────────────────────────────────────────────
function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createUser = useCreateUser();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);

  const TEMPLATE_HEADERS = ["employeeCode", "name", "email", "mobile", "designation", "role", "password"];

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const rows = await parseCSVFile(file);
      let success = 0, failed = 0;
      for (const row of rows) {
        if (!row.employeeCode || !row.name || !row.email) { failed++; continue; }
        try {
          await new Promise<void>((resolve, reject) => {
            createUser.mutate({ data: { employeeCode: row.employeeCode, name: row.name, email: row.email, mobile: row.mobile || undefined, designation: row.designation || undefined, role: row.role || "employee", password: row.password || "User@123", status: "active" } }, { onSuccess: () => { success++; resolve(); }, onError: () => { failed++; resolve(); } });
          });
        } catch { failed++; }
      }
      setResults({ success, failed });
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } finally { setImporting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) { setFile(null); setResults(null); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Users from CSV</DialogTitle>
          <DialogDescription>Upload a CSV file to bulk-import users. Download the template to see the required format.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => downloadCSVTemplate(["employeeCode", "name", "email", "mobile", "designation", "role", "password"], "users")}>
            <Download className="w-4 h-4" /> Download CSV Template
          </Button>
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            {file ? (
              <div className="space-y-1">
                <FileSpreadsheet className="w-8 h-8 text-green-500 mx-auto" />
                <p className="text-sm font-medium">{file.name}</p>
                <button className="text-xs text-muted-foreground hover:underline" onClick={() => setFile(null)}>Remove</button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Click to select CSV file</p>
                <p className="text-xs text-muted-foreground">or drag and drop</p>
                <input type="file" accept=".csv" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>
          {results && (
            <div className="rounded-lg border p-3 bg-slate-50 text-sm">
              <p className="font-semibold">Import complete:</p>
              <p className="text-green-600">{results.success} users imported successfully</p>
              {results.failed > 0 && <p className="text-red-500">{results.failed} rows failed (check required fields)</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleImport} disabled={!file || importing}>{importing ? "Importing..." : "Import"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function UsersPage() {
  const confirm = useConfirmation();
  const { data: users, isLoading } = useListUsers();
  const { data: treeData, isLoading: treeLoading } = useQuery({ queryKey: ["users-tree"], queryFn: () => localApiFetch("/api/users/tree") });
  const deleteUser = useDeleteUser();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [view, setView] = useState<"table" | "tree">("table");
  const { data: departments } = useListDepartments();
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const filtered = useMemo(() => {
    return (users || []).filter(u => {
      if (statusFilter !== "all" && u.status?.toLowerCase() !== statusFilter) return false;
      if (roleFilter === "admin_manager" && u.role !== "admin" && u.role !== "manager") return false;
      if (roleFilter !== "all" && roleFilter !== "admin_manager" && u.role !== roleFilter) return false;
      if (deptFilter !== "all" && String(u.departmentId) !== deptFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!u.name.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s) && !u.employeeCode.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, statusFilter, deptFilter]);

  const paged = paginate(filtered);

  const counts = useMemo(() => ({
    all: users?.length || 0,
    active: users?.filter(u => u.status?.toLowerCase() === "active").length || 0,
    inactive: users?.filter(u => u.status?.toLowerCase() === "inactive").length || 0,
    admins: users?.filter(u => u.role === "admin" || u.role === "manager").length || 0,
  }), [users]);

  const exportData = filtered.map(u => ({
    Code: u.employeeCode, Name: u.name, Email: u.email, Mobile: u.mobile || "-",
    Department: u.departmentName || "-", Designation: u.designation || "-", Role: u.role, Status: u.status,
  }));
  const exportHeaders = ["Code", "Name", "Email", "Mobile", "Department", "Designation", "Role", "Status"];
  const exportKeys = exportHeaders;

  const handleDelete = async (id: number, name: string) => {
    const confirmed = await confirm({
      title: "Delete user?",
      description: `Delete user "${name}"? This cannot be undone.`,
      confirmText: "Delete User",
      variant: "destructive",
    });
    if (!confirmed) return;
    deleteUser.mutate({ id }, {
      onSuccess: () => { toast.success("User deleted"); qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); },
      onError: () => toast.error("Failed to delete user"),
    });
  };

  const openCreate = () => {
    setEditingUser(null);
    setAddOpen(true);
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setAddOpen(true);
  };

  return (
    <AppLayout title="User Management">
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">User Directory</h2>
            <p className="text-muted-foreground text-sm">Manage employee accounts, roles, and department assignments.</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu
              exportData={exportData}
              exportHeaders={exportHeaders}
              exportKeys={exportKeys}
              exportFilename="users"
              exportTitle="User Directory"
            />
            <div className="flex overflow-hidden rounded-md border bg-white">
              <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" className="rounded-none gap-2" onClick={() => setView("table")}>
                <List className="h-4 w-4" /> Table
              </Button>
              <Button variant={view === "tree" ? "secondary" : "ghost"} size="sm" className="rounded-none gap-2" onClick={() => setView("tree")}>
                <GitBranch className="h-4 w-4" /> Tree
              </Button>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4" /> Import
            </Button>
            <Button size="sm" className="gap-2" onClick={openCreate} data-testid="button-add-user">
              <UserPlus className="w-4 h-4" /> Add User
            </Button>
          </div>
        </div>

        <ModuleStats
          stats={[
            { label: "Total Users", value: counts.all, icon: Users, tone: "sky", active: statusFilter === "all" && roleFilter === "all", onClick: () => { setStatusFilter("all"); setRoleFilter("all"); setPage(1); } },
            { label: "Active", value: counts.active, icon: UserCheck, tone: "emerald", active: statusFilter === "active", onClick: () => { setStatusFilter("active"); setPage(1); } },
            { label: "Inactive", value: counts.inactive, icon: UserX, tone: "slate", active: statusFilter === "inactive", onClick: () => { setStatusFilter("inactive"); setPage(1); } },
            { label: "Admin / Manager", value: counts.admins, icon: ShieldCheck, tone: "violet", active: roleFilter === "admin_manager", onClick: () => { setRoleFilter("admin_manager"); setStatusFilter("all"); setPage(1); } },
          ]}
        />

        {/* Filters */}
        <Card className="border-slate-200">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search name, email, code..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {view === "tree" ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {treeLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading employee tree...</div>
              ) : (
                <EmployeeTree nodes={treeData?.tree || []} />
              )}
            </CardContent>
          </Card>
        ) : (
        /* Table */
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading users...</div>
            ) : !paged.length ? (
              <div className="p-12 text-center text-muted-foreground">No users match your filters.</div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((user, i) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="text-muted-foreground text-sm">{(page - 1) * pageSize + i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatarUrl || ""} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-sm">{user.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{user.employeeCode}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{user.email}</div>
                        <div className="text-xs text-muted-foreground">{user.mobile || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{user.departmentName || "-"}</div>
                        <div className="text-xs text-muted-foreground">{user.designation || "-"}</div>
                      </TableCell>
                      <TableCell>{roleBadge(user.role)}</TableCell>
                      <TableCell>{statusBadge(user.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2" onClick={() => openEdit(user)}>
                              <Pencil className="w-4 h-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 gap-2" onClick={() => handleDelete(user.id, user.name)}>
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
            exportData={exportData} exportHeaders={exportHeaders} exportKeys={exportKeys}
            exportFilename="users" exportTitle="User Directory"
          />
        </Card>
        )}

        <UserDialog open={addOpen} onOpenChange={setAddOpen} editingUser={editingUser} />
        <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      </div>
    </AppLayout>
  );
}
