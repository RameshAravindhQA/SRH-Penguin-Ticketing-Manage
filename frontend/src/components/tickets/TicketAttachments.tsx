import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, File, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteTicketAttachment,
  downloadTicketAttachment,
  formatBytes,
  listTicketAttachments,
  readFileAsAttachment,
  uploadTicketAttachments,
  type AttachmentUploadFile,
} from "@/lib/ticket-attachments";

export function AttachmentPicker({
  files,
  onFilesChange,
}: {
  files: AttachmentUploadFile[];
  onFilesChange: (files: AttachmentUploadFile[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [reading, setReading] = React.useState(false);

  const addFiles = async (selected: FileList | null) => {
    if (!selected?.length) return;
    setReading(true);
    try {
      const parsed = await Promise.all(Array.from(selected).map(readFileAsAttachment));
      onFilesChange([...files, ...parsed]);
      toast.success(`${parsed.length} attachment${parsed.length === 1 ? "" : "s"} ready`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read attachment");
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Attachments</div>
          <div className="text-xs text-muted-foreground">Multiple files supported. Maximum 10 MB per file.</div>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => inputRef.current?.click()} disabled={reading}>
          <Paperclip className="h-4 w-4" />
          {reading ? "Reading..." : "Add Files"}
        </Button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(event) => addFiles(event.target.files)} />
      </div>
      {files.length > 0 && (
        <div className="rounded-md border">
          {files.map((file, index) => (
            <div key={`${file.fileName}-${index}`} className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{file.fileName}</div>
                <div className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</div>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onFilesChange(files.filter((_, i) => i !== index))}>
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TicketAttachments({ ticketId }: { ticketId: number }) {
  const queryClient = useQueryClient();
  const [files, setFiles] = React.useState<AttachmentUploadFile[]>([]);
  const [saving, setSaving] = React.useState(false);
  const queryKey = ["ticket-attachments", ticketId];
  const { data: attachments, isLoading } = useQuery({
    queryKey,
    queryFn: () => listTicketAttachments(ticketId),
    enabled: !!ticketId,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const upload = async () => {
    if (!files.length) {
      toast.error("Select at least one attachment");
      return;
    }
    setSaving(true);
    try {
      await uploadTicketAttachments(ticketId, files);
      setFiles([]);
      refresh();
      toast.success("Attachments uploaded");
    } catch {
      toast.error("Failed to upload attachments");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (attachmentId: number) => {
    try {
      await deleteTicketAttachment(ticketId, attachmentId);
      refresh();
      toast.success("Attachment deleted");
    } catch {
      toast.error("Failed to delete attachment");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b py-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4" /> Attachments
        </CardTitle>
        <Button size="sm" className="gap-2" onClick={upload} disabled={saving || !files.length}>
          <Upload className="h-4 w-4" /> {saving ? "Uploading..." : "Upload"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        <AttachmentPicker files={files} onFilesChange={setFiles} />
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading attachments...</div>
          ) : !attachments?.length ? (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">No attachments yet.</div>
          ) : (
            attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100">
                    <File className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{attachment.fileName}</div>
                    <div className="text-xs text-muted-foreground">{formatBytes(attachment.sizeBytes)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadTicketAttachment(ticketId, attachment)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(attachment.id)}>
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
