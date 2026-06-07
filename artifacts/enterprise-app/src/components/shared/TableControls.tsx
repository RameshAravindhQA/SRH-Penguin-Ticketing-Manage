import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, FileSpreadsheet, FileText, File } from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export";

interface TableControlsProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  exportData?: Record<string, unknown>[];
  exportHeaders?: string[];
  exportKeys?: string[];
  exportFilename?: string;
  exportTitle?: string;
  showExport?: boolean;
}

export function TableControls({
  total, page, pageSize, onPageChange, onPageSizeChange,
  exportData, exportHeaders, exportKeys, exportFilename = "export", exportTitle = "Export",
  showExport = true,
}: TableControlsProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const handleExportCSV = () => exportData && exportToCSV(exportData, exportFilename);
  const handleExportExcel = () => exportData && exportToExcel(exportData, exportFilename);
  const handleExportPDF = () => exportData && exportHeaders && exportKeys && exportToPDF(exportData, exportHeaders, exportKeys, exportFilename, exportTitle);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select value={String(pageSize)} onValueChange={v => { onPageSizeChange(Number(v)); onPageChange(1); }}>
            <SelectTrigger className="h-7 w-16 text-xs border-slate-200">
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
          {total === 0 ? "No records" : `${from}–${to} of ${total}`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {showExport && exportData && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs border-slate-200">
                <Download className="w-3.5 h-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                <File className="w-4 h-4 text-green-600" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                <FileText className="w-4 h-4 text-red-500" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(1)} disabled={page === 1}>
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2 whitespace-nowrap">
            {page} / {totalPages}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>
            <ChevronsRight className="w-4 h-4" />
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
