import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, FileText, FolderPlus, Pencil, Plus, Printer, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatBytes, readFileAsAttachment } from "@/lib/ticket-attachments";
import { ExportMenu, TableControls, usePagination } from "@/components/shared/TableControls";
import { useConfirmation } from "@/components/shared/ConfirmationProvider";

type FolderItem = { id: number; name: string; parentId: number | null; description: string | null };
type DocumentItem = { id: number; folderId: number | null; name: string; fileName: string | null; mimeType: string | null; sizeBytes: number; googleSheetUrl: string | null; description: string | null };

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
}

async function apiFetch(path: string, init?: RequestInit) {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return null;
  return response.json();
}

function authUrl(path: string) {
  return `${apiBase()}${path}`;
}

export default function DocumentsPage() {
  const confirm = useConfirmation();
  const queryClient = useQueryClient();
  const [folderId, setFolderId] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [folderOpen, setFolderOpen] = React.useState(false);
  const [docOpen, setDocOpen] = React.useState(false);
  const [editingFolder, setEditingFolder] = React.useState<FolderItem | null>(null);
  const [editingDoc, setEditingDoc] = React.useState<DocumentItem | null>(null);
  const [viewer, setViewer] = React.useState<{ doc: DocumentItem; url: string } | null>(null);
  const [folderForm, setFolderForm] = React.useState({ name: "", parentId: "", description: "" });
  const [docForm, setDocForm] = React.useState({ name: "", folderId: "", description: "", googleSheetUrl: "", fileName: "", mimeType: "", sizeBytes: 0, contentBase64: "" });
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(10);

  const { data: folders } = useQuery<FolderItem[]>({ queryKey: ["document-folders"], queryFn: () => apiFetch("/api/document-folders") });
  const { data: documents, isLoading } = useQuery<DocumentItem[]>({ queryKey: ["documents", folderId], queryFn: () => apiFetch(`/api/documents${folderId !== "all" ? `?folderId=${folderId}` : ""}`) });
  const folderMap = new Map((folders || []).map(folder => [folder.id, folder.name]));
  const filtered = (documents || []).filter(doc => {
    const term = search.toLowerCase();
    if (!term) return true;
    return doc.name.toLowerCase().includes(term) || (doc.fileName || "").toLowerCase().includes(term) || (doc.description || "").toLowerCase().includes(term);
  });
  const paged = paginate(filtered);
  const exportHeaders = ["Name", "Folder", "Type", "File", "Size", "Description"];
  const exportData = filtered.map(doc => ({
    Name: doc.name,
    Folder: doc.folderId ? folderMap.get(doc.folderId) || "-" : "Uncategorized",
    Type: doc.googleSheetUrl ? "Google Sheet" : doc.mimeType || "-",
    File: doc.fileName || "-",
    Size: formatBytes(doc.sizeBytes),
    Description: doc.description || "-",
  }));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["document-folders"] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  const openFolder = (folder?: FolderItem) => {
    setEditingFolder(folder || null);
    setFolderForm(folder ? { name: folder.name, parentId: folder.parentId ? String(folder.parentId) : "", description: folder.description || "" } : { name: "", parentId: "", description: "" });
    setFolderOpen(true);
  };

  const saveFolder = async () => {
    if (!folderForm.name.trim()) { toast.error("Folder name is required"); return; }
    try {
      const body = JSON.stringify({ ...folderForm, parentId: folderForm.parentId ? Number(folderForm.parentId) : undefined });
      if (editingFolder) await apiFetch(`/api/document-folders/${editingFolder.id}`, { method: "PATCH", body });
      else await apiFetch("/api/document-folders", { method: "POST", body });
      toast.success(editingFolder ? "Folder updated" : "Folder created");
      setFolderOpen(false);
      refresh();
    } catch { toast.error("Failed to save folder"); }
  };

  const openDoc = (doc?: DocumentItem) => {
    setEditingDoc(doc || null);
    setDocForm(doc ? { name: doc.name, folderId: doc.folderId ? String(doc.folderId) : "", description: doc.description || "", googleSheetUrl: doc.googleSheetUrl || "", fileName: doc.fileName || "", mimeType: doc.mimeType || "", sizeBytes: doc.sizeBytes, contentBase64: "" } : { name: "", folderId: folderId === "all" ? "" : folderId, description: "", googleSheetUrl: "", fileName: "", mimeType: "", sizeBytes: 0, contentBase64: "" });
    setDocOpen(true);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await readFileAsAttachment(file);
      setDocForm(current => ({ ...current, name: current.name || file.name, fileName: parsed.fileName, mimeType: parsed.mimeType, sizeBytes: parsed.sizeBytes, contentBase64: parsed.contentBase64 }));
      toast.success("File ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read file");
    }
  };

  const saveDoc = async () => {
    if (!docForm.name.trim()) { toast.error("Document name is required"); return; }
    try {
      const body = JSON.stringify({ ...docForm, folderId: docForm.folderId ? Number(docForm.folderId) : undefined });
      if (editingDoc) await apiFetch(`/api/documents/${editingDoc.id}`, { method: "PATCH", body });
      else await apiFetch("/api/documents", { method: "POST", body });
      toast.success(editingDoc ? "Document updated" : "Document created");
      setDocOpen(false);
      refresh();
    } catch { toast.error("Failed to save document"); }
  };

  const removeFolder = async (id: number) => {
    const confirmed = await confirm({
      title: "Delete folder?",
      description: "Files in this folder will move to uncategorized.",
      confirmText: "Delete Folder",
      variant: "destructive",
    });
    if (!confirmed) return;
    await apiFetch(`/api/document-folders/${id}`, { method: "DELETE" });
    toast.success("Folder deleted");
    refresh();
  };

  const removeDoc = async (id: number) => {
    const confirmed = await confirm({
      title: "Delete document?",
      description: "This document will be removed from document management.",
      confirmText: "Delete Document",
      variant: "destructive",
    });
    if (!confirmed) return;
    await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
    toast.success("Document deleted");
    refresh();
  };

  const openContent = async (doc: DocumentItem, print = false) => {
    if (doc.googleSheetUrl) { window.open(doc.googleSheetUrl, "_blank"); return; }
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(authUrl(`/api/documents/${doc.id}/content`), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error(await response.text());
      const url = URL.createObjectURL(await response.blob());
      setViewer(current => {
        if (current?.url) URL.revokeObjectURL(current.url);
        return { doc, url };
      });
      if (print) setTimeout(() => (document.getElementById("document-preview-frame") as HTMLIFrameElement | null)?.contentWindow?.print(), 500);
    } catch { toast.error("Failed to open document"); }
  };

  React.useEffect(() => () => { if (viewer?.url) URL.revokeObjectURL(viewer.url); }, [viewer?.url]);

  return (
    <AppLayout title="Document Management">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Document Management</h2>
            <p className="text-sm text-muted-foreground">Table view for folders, attachments, printable documents, and Google Sheet links.</p>
          </div>
          <div className="flex gap-2">
            <ExportMenu exportData={exportData} exportHeaders={exportHeaders} exportKeys={exportHeaders} exportFilename="documents" exportTitle="Documents" />
            <Button variant="outline" size="sm" className="gap-2" onClick={() => openFolder()}><FolderPlus className="h-4 w-4" /> Folder</Button>
            <Button size="sm" className="gap-2" onClick={() => openDoc()}><Plus className="h-4 w-4" /> Document</Button>
          </div>
        </div>

        <Card className="border-slate-200">
          <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Input className="h-9 min-w-[220px] flex-1" placeholder="Search documents..." value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
            <Select value={folderId} onValueChange={value => { setFolderId(value); setPage(1); }}>
              <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                {folders?.map(folder => <SelectItem key={folder.id} value={String(folder.id)}>{folder.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? <div className="p-8 text-center text-muted-foreground">Loading documents...</div> : !paged.length ? <div className="p-12 text-center text-muted-foreground">No documents found.</div> : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Folder</TableHead><TableHead>Type</TableHead><TableHead>Size</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell><div className="font-medium">{doc.name}</div><div className="text-xs text-muted-foreground">{doc.fileName || doc.googleSheetUrl || "-"}</div></TableCell>
                      <TableCell>{doc.folderId ? folderMap.get(doc.folderId) || "-" : "Uncategorized"}</TableCell>
                      <TableCell>{doc.googleSheetUrl ? "Google Sheet" : doc.mimeType || "-"}</TableCell>
                      <TableCell>{formatBytes(doc.sizeBytes)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openContent(doc)}>{doc.googleSheetUrl ? <ExternalLink className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</Button>
                        {!doc.googleSheetUrl && <a href={authUrl(`/api/documents/${doc.id}/download`)} target="_blank" rel="noreferrer"><Button variant="outline" size="sm"><Download className="h-4 w-4" /></Button></a>}
                        <Button variant="outline" size="sm" onClick={() => openContent(doc, true)}><Printer className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDoc(doc)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeDoc(doc.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <TableControls total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </Card>

        <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingFolder ? "Edit Folder" : "Create Folder"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5"><Label>Name</Label><Input value={folderForm.name} onChange={e => setFolderForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea value={folderForm.description} onChange={e => setFolderForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setFolderOpen(false)}>Cancel</Button><Button onClick={saveFolder}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={docOpen} onOpenChange={setDocOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editingDoc ? "Edit Document" : "Add Document"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5"><Label>Name</Label><Input value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Folder</Label><Select value={docForm.folderId || "none"} onValueChange={v => setDocForm(f => ({ ...f, folderId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Uncategorized</SelectItem>{folders?.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}</SelectContent></Select></div>
              {!editingDoc && <div className="rounded-md border border-dashed p-4"><Label className="mb-2 block">Upload File</Label><Input type="file" onChange={e => handleFile(e.target.files?.[0])} /><div className="mt-2 text-xs text-muted-foreground">Max 10 MB. Selected: {docForm.fileName || "No file selected"}</div></div>}
              <div className="space-y-1.5"><Label>Google Sheet URL</Label><Input value={docForm.googleSheetUrl} onChange={e => setDocForm(f => ({ ...f, googleSheetUrl: e.target.value }))} placeholder="https://docs.google.com/spreadsheets/..." /></div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea value={docForm.description} onChange={e => setDocForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setDocOpen(false)}>Cancel</Button><Button onClick={saveDoc}><Upload className="mr-2 h-4 w-4" /> Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewer} onOpenChange={(open) => !open && setViewer(null)}>
          <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden">
            <DialogHeader><DialogTitle>{viewer?.doc.name}</DialogTitle></DialogHeader>
            <div className="h-[70vh] overflow-hidden rounded-md border bg-white">{viewer && <iframe id="document-preview-frame" src={viewer.url} className="h-full w-full" title={viewer.doc.name} />}</div>
            <DialogFooter><Button variant="outline" onClick={() => setViewer(null)}>Close</Button><Button onClick={() => (document.getElementById("document-preview-frame") as HTMLIFrameElement | null)?.contentWindow?.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
