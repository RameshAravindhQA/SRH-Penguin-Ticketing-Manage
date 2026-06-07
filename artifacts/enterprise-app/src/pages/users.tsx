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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, MoreHorizontal, Search, Upload, Download, Trash2, FileSpreadsheet, Camera } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TableControls, usePagination } from "@/components/shared/TableControls";
import { downloadCSVTemplate, parseCSVFile, exportToCSV, exportToExcel, exportToPDF } from "@/lib/export";

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
function AddUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createUser = useCreateUser();
  const { data: departments } = useListDepartments();
  const { data: roles } = useListRoles();
  const qc = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ employeeCode: "", name: "", email: "", mobile: "", departmentId: "", designation: "", role: "employee", roleId: "", password: "User@123", status: "active", avatarUrl: "" });
  const [avatarPreview, setAvatarPreview] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setS = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

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
    createUser.mutate({
      data: {
        ...form,
        departmentId: form.departmentId ? Number(form.departmentId) : undefined,
        roleId: form.roleId ? Number(form.roleId) : undefined,
        avatarUrl: form.avatarUrl || undefined,
      }
    }, {
      onSuccess: () => {
        toast.success("User created successfully");
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        onOpenChange(false);
        setForm({ employeeCode: "", name: "", email: "", mobile: "", departmentId: "", designation: "", role: "employee", roleId: "", password: "User@123", status: "active", avatarUrl: "" });
        setAvatarPreview("");
      },
      onError: () => toast.error("Failed to create user"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Create a new employee account with department and role assignment.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-5 py-2">
          {/* Avatar Upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarPreview} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">{form.name ? form.name[0]?.toUpperCase() : "?"}</AvatarFallback>
              </Avatar>
              <button onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow">
                <Camera className="w-3 h-3 text-white" />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Profile Photo</p>
              <p className="text-xs text-muted-foreground">Click the camera icon to upload. JPG, PNG, GIF up to 2MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Employee Code <span className="text-red-500">*</span></Label><Input value={form.employeeCode} onChange={set("employeeCode")} placeholder="EMP-007" /></div>
            <div className="space-y-1.5"><Label>Full Name <span className="text-red-500">*</span></Label><Input value={form.name} onChange={set("name")} placeholder="John Smith" /></div>
            <div className="space-y-1.5"><Label>Email <span className="text-red-500">*</span></Label><Input type="email" value={form.email} onChange={set("email")} placeholder="john@company.com" /></div>
            <div className="space-y-1.5"><Label>Mobile</Label><Input value={form.mobile} onChange={set("mobile")} placeholder="+91 9000000000" /></div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={setS("departmentId")}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments?.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Designation</Label><Input value={form.designation} onChange={set("designation")} placeholder="Senior Developer" /></div>
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
            <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={form.password} onChange={set("password")} /></div>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createUser.isPending}>{createUser.isPending ? "Creating..." : "Create User"}</Button>
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
  const { data: users, isLoading } = useListUsers();
  const deleteUser = useDeleteUser();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { data: departments } = useListDepartments();
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const filtered = useMemo(() => {
    return (users || []).filter(u => {
      if (statusFilter !== "all" && u.status?.toLowerCase() !== statusFilter) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (deptFilter !== "all" && String(u.departmentId) !== deptFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!u.name.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s) && !u.employeeCode.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, statusFilter, deptFilter]);

  const paged = paginate(filtered);

  const exportData = filtered.map(u => ({
    Code: u.employeeCode, Name: u.name, Email: u.email, Mobile: u.mobile || "-",
    Department: u.departmentName || "-", Designation: u.designation || "-", Role: u.role, Status: u.status,
  }));
  const exportHeaders = ["Code", "Name", "Email", "Mobile", "Department", "Designation", "Role", "Status"];
  const exportKeys = exportHeaders;

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    deleteUser.mutate({ id }, {
      onSuccess: () => { toast.success("User deleted"); qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); },
      onError: () => toast.error("Failed to delete user"),
    });
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
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4" /> Import
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)} data-testid="button-add-user">
              <UserPlus className="w-4 h-4" /> Add User
            </Button>
          </div>
        </div>

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

        {/* Table */}
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

        <AddUserDialog open={addOpen} onOpenChange={setAddOpen} />
        <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      </div>
    </AppLayout>
  );
}
