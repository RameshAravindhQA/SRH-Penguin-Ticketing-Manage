export type AttachmentUploadFile = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64: string;
};

export type TicketAttachment = {
  id: number;
  ticketId: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: number;
  createdAt: string;
};

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function readFileAsAttachment(file: File): Promise<AttachmentUploadFile> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      reject(new Error(`${file.name} is larger than 10 MB`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        contentBase64: value.includes(",") ? value.split(",")[1] : value,
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function listTicketAttachments(ticketId: number): Promise<TicketAttachment[]> {
  const response = await fetch(`${apiBase()}/api/tickets/${ticketId}/attachments`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function uploadTicketAttachments(ticketId: number, files: AttachmentUploadFile[]) {
  const response = await fetch(`${apiBase()}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ files }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function deleteTicketAttachment(ticketId: number, attachmentId: number) {
  const response = await fetch(`${apiBase()}/api/tickets/${ticketId}/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await response.text());
}

export async function downloadTicketAttachment(ticketId: number, attachment: TicketAttachment) {
  const response = await fetch(`${apiBase()}/api/tickets/${ticketId}/attachments/${attachment.id}/download`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await response.text());
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
