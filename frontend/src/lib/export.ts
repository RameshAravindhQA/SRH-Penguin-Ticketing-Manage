import * as XLSX from "xlsx";

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [
    keys.join(","),
    ...data.map(row =>
      keys.map(k => {
        const val = row[k] ?? "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") || str.includes("\n") ? `"${str}"` : str;
      }).join(",")
    )
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = "Sheet1") {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(
  data: Record<string, unknown>[],
  headers: string[],
  keys: string[],
  filename: string,
  title: string
) {
  if (!data.length) return;

  Promise.all([import("jspdf"), import("jspdf-autotable")])
    .then(([{ default: jsPDF }, { default: autoTable }]) => {
      const orientation = headers.length > 6 ? "landscape" : "portrait";
      const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const generatedAt = new Date().toLocaleString();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(title, 32, 34);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${generatedAt}`, 32, 50);
      doc.text(`Records: ${data.length}`, pageWidth - 32, 50, { align: "right" });

      autoTable(doc, {
        head: [headers],
        body: data.map(row => keys.map(k => String(row[k] ?? "-"))),
        startY: 66,
        margin: { left: 32, right: 32 },
        theme: "grid",
        tableWidth: "auto",
        showHead: "everyPage",
        styles: {
          font: "helvetica",
          fontSize: 7,
          cellPadding: 4,
          overflow: "linebreak",
          valign: "middle",
          lineColor: [226, 232, 240],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: "bold",
          halign: "left",
        },
        bodyStyles: {
          textColor: [30, 41, 59],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: () => {
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - 32, pageHeight - 18, { align: "right" });
        },
      });

      doc.save(`${filename}.pdf`);
    })
    .catch(error => {
      console.error("Failed to export PDF", error);
    });
}

export function downloadCSVTemplate(headers: string[], filename: string) {
  const csv = headers.join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCSVFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { resolve([]); return; }
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const rows = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        return headers.reduce((acc, h, i) => { acc[h] = values[i] ?? ""; return acc; }, {} as Record<string, string>);
      });
      resolve(rows);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
