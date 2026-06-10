export type DocumentFolder = {
  id: number;
  name: string;
  parentId: number | null;
  description: string | null;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentFile = {
  id: number;
  folderId: number | null;
  name: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number;
  contentBase64: string | null;
  googleSheetUrl: string | null;
  description: string | null;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertDocumentFolder = Omit<DocumentFolder, "id" | "createdAt" | "updatedAt">;
export type InsertDocumentFile = Omit<DocumentFile, "id" | "createdAt" | "updatedAt">;
