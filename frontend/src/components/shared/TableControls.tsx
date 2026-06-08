import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, FileSpreadsheet, FileText, File } from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export";

interface ExportMenuProps {
  exportData?: Record<string, unknown>[];
  exportHeaders?: string[];
  exportKeys?: string[];
  exportFilename?: string;
  exportTitle?: string;
  label?: string;
}

interface TableControlsProps extends ExportMenuProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  showExport?: boolean;
}

export function ExportMenu({
  exportData,
  exportHeaders,
  exportKeys,
  exportFilename = "export",
  exportTitle = "Export",
  label = "Export",
}: ExportMenuProps) {
  const disabled = !exportData?.length;
  const handleExportCSV = () => exportData?.length && exportToCSV(exportData, exportFilename);
  const handleExportExcel = () => exportData?.length && exportToExcel(exportData, exportFilename);
  const handleExportPDF = () =>
    exportData?.length &&
    exportHeaders &&
    exportKeys &&
    exportToPDF(exportData, exportHeaders, exportKeys, exportFilename, exportTitle);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 border-slate-200" disabled={disabled}>
          <Download className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
          <File className="h-4 w-4 text-green-600" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
          <FileText className="h-4 w-4 text-red-500" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TableControls({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  exportData,
  exportHeaders,
  exportKeys,
  exportFilename = "export",
  exportTitle = "Export",
  showExport = true,
}: TableControlsProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t bg-slate-50/50 px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select value={String(pageSize)} onValueChange={v => { onPageSizeChange(Number(v)); onPageChange(1); }}>
            <SelectTrigger className="h-7 w-16 border-slate-200 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map(s => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          {total === 0 ? "No records" : `${from}-${to} of ${total}`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {showExport && exportData && (
          <ExportMenu
            exportData={exportData}
            exportHeaders={exportHeaders}
            exportKeys={exportKeys}
            exportFilename={exportFilename}
            exportTitle={exportTitle}
          />
        )}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(1)} disabled={page === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="whitespace-nowrap px-2 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function usePagination(pageSize = 10) {
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(pageSize);
  const paginate = <T,>(data: T[]) => data.slice((page - 1) * size, page * size);
  const reset = () => setPage(1);
  return { page, pageSize: size, setPage, setPageSize: (s: number) => { setSize(s); setPage(1); }, paginate, reset };
}
