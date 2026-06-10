type WorkflowNode = {
  id: number;
  name: string;
  nodeType: string;
  sequenceOrder: number;
  status: string;
  isStart: boolean;
  isEnd: boolean;
  assignedToId: number | null;
  assignedToName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  transitionSeconds: number | null;
};

type ActivityRow = {
  nodeName: string | null;
  userName: string | null;
  action: string;
  fromNodeName?: string | null;
  toNodeName?: string | null;
  durationSeconds: number | null;
  transitionSeconds: number | null;
  remarks: string | null;
  occurredAt: string;
};

export type ProjectExportData = {
  project: {
    projectNo: string;
    title: string;
    status: string;
    priority: string;
    progress: number;
    ownerName: string | null;
    processOwnerName: string | null;
    startDate: string | null;
    endDate: string | null;
    collaborators: { name: string; role: string; permissions: string[] }[];
  };
  workflow: WorkflowNode[];
  activities: ActivityRow[];
  flags: { nodeName: string | null; description: string; status: string; raisedByName: string | null; resolvedByName: string | null; createdAt: string; resolvedAt: string | null }[];
  approvals: { nodeName: string | null; status: string; remarks: string | null; approvedByName: string | null; createdAt: string }[];
  comments: { authorName: string | null; content: string; createdAt: string }[];
  auditLogs: { action: string; userName: string | null; entityRef: string | null; createdAt: string }[];
  analytics: {
    totalNodes: number;
    completedNodes: number;
    progressPercent: number;
    totalDurationSeconds: number;
    totalTransitionSeconds: number;
    totalDurationHours: number;
    flagsRaised: number;
    flagsResolved: number;
    approvalsCount: number;
    commentsCount: number;
  };
};

export type UserExportData = {
  project: { projectNo: string; title: string };
  user: { name: string; employeeCode: string | null };
  summary: {
    tasksWorked: number;
    commentsAdded: number;
    flagsRaised: number;
    approvalsPerformed: number;
    daysWorked: number;
    totalHoursWorked: number;
  };
  activities: { nodeName: string | null; action: string; durationSeconds: number | null; transitionSeconds: number | null; remarks: string | null; occurredAt: string }[];
  comments: { content: string; createdAt: string }[];
  flags: { description: string; status: string; createdAt: string }[];
  approvals: { status: string; remarks: string | null; createdAt: string }[];
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const HEAD_FILL: [number, number, number] = [37, 99, 235];
const TEXT_COLOR: [number, number, number] = [30, 41, 59];
const MUTED_COLOR: [number, number, number] = [100, 116, 139];

export async function exportProjectPDF(data: ProjectExportData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = new Date().toLocaleString();
  const { project, workflow, activities, flags, approvals, comments, auditLogs, analytics } = data;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(`Project Report - ${project.projectNo}`, 32, 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(project.title, 32, 54);

  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`Generated: ${generatedAt}`, 32, 70);
  doc.text(`Status: ${project.status} | Priority: ${project.priority} | Progress: ${project.progress}%`, pageWidth - 32, 70, { align: "right" });

  let y = 90;

  // Project summary table
  autoTable(doc, {
    startY: y,
    margin: { left: 32, right: 32 },
    theme: "grid",
    head: [["Owner", "Process Owner", "Start Date", "End Date", "Total Hours", "Flags (Open/Total)", "Approvals"]],
    body: [[
      project.ownerName ?? "-",
      project.processOwnerName ?? "-",
      formatDateTime(project.startDate),
      formatDateTime(project.endDate),
      `${analytics.totalDurationHours}h`,
      `${analytics.flagsRaised - analytics.flagsResolved}/${analytics.flagsRaised}`,
      `${analytics.approvalsCount}`,
    ]],
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4, textColor: TEXT_COLOR },
    headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  // Workflow diagram (connected boxes)
  if (workflow.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Workflow Diagram", 32, y);
    y += 14;

    const boxWidth = 130;
    const boxHeight = 44;
    const gap = 30;
    const perRow = Math.max(1, Math.floor((pageWidth - 64 + gap) / (boxWidth + gap)));
    const statusColors: Record<string, [number, number, number]> = {
      completed: [220, 252, 231],
      in_progress: [254, 249, 195],
      pending: [241, 245, 249],
    };

    workflow.forEach((node, idx) => {
      const col = idx % perRow;
      const row = Math.floor(idx / perRow);
      const x = 32 + col * (boxWidth + gap);
      const by = y + row * (boxHeight + gap);

      if (by + boxHeight > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 40;
      }
      const boxY = by;

      const fill = statusColors[node.status] ?? [241, 245, 249];
      doc.setFillColor(...fill);
      doc.setDrawColor(148, 163, 184);
      doc.roundedRect(x, boxY, boxWidth, boxHeight, 4, 4, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const label = node.isStart ? `START: ${node.name}` : node.isEnd ? `END: ${node.name}` : node.name;
      doc.text(label, x + 6, boxY + 14, { maxWidth: boxWidth - 12 });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED_COLOR);
      doc.text(`Status: ${node.status}`, x + 6, boxY + 26);
      doc.text(`Owner: ${node.assignedToName ?? "-"}`, x + 6, boxY + 36);
      doc.text(`Dur: ${formatDuration(node.durationSeconds)}  Trans: ${formatDuration(node.transitionSeconds)}`, x + 6, boxY + 44 - 2);

      // arrow to next node
      if (idx < workflow.length - 1) {
        const nextCol = (idx + 1) % perRow;
        const nextRow = Math.floor((idx + 1) / perRow);
        if (nextRow === row) {
          const x2 = 32 + nextCol * (boxWidth + gap);
          doc.setDrawColor(100, 116, 139);
          doc.line(x + boxWidth, boxY + boxHeight / 2, x2, boxY + boxHeight / 2);
          doc.line(x2, boxY + boxHeight / 2, x2 - 6, boxY + boxHeight / 2 - 4);
          doc.line(x2, boxY + boxHeight / 2, x2 - 6, boxY + boxHeight / 2 + 4);
        } else {
          const xMid = x + boxWidth / 2;
          doc.setDrawColor(100, 116, 139);
          doc.line(xMid, boxY + boxHeight, xMid, boxY + boxHeight + gap / 2);
          doc.line(32 + boxWidth / 2, boxY + boxHeight + gap / 2, xMid, boxY + boxHeight + gap / 2);
          doc.line(32 + boxWidth / 2, boxY + boxHeight + gap / 2, 32 + boxWidth / 2, boxY + boxHeight + gap);
        }
      }
    });

    const rows = Math.ceil(workflow.length / perRow);
    y = y + rows * (boxHeight + gap) + 10;
  }

  // Workflow table with durations
  if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 40; }
  autoTable(doc, {
    startY: y,
    margin: { left: 32, right: 32 },
    theme: "grid",
    head: [["#", "Node", "Type", "Status", "Assigned To", "Started", "Completed", "Duration", "Transition"]],
    body: workflow.map(n => [
      String(n.sequenceOrder),
      n.name,
      n.nodeType,
      n.status,
      n.assignedToName ?? "-",
      formatDateTime(n.startedAt),
      formatDateTime(n.completedAt),
      formatDuration(n.durationSeconds),
      formatDuration(n.transitionSeconds),
    ]),
    styles: { font: "helvetica", fontSize: 7, cellPadding: 4, textColor: TEXT_COLOR, lineColor: [226, 232, 240], lineWidth: 0.5 },
    headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  // Contributors
  if (project.collaborators.length) {
    if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Contributors", 32, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: 32, right: 32 },
      theme: "grid",
      head: [["Name", "Role", "Permissions"]],
      body: project.collaborators.map(c => [c.name, c.role, c.permissions.join(", ")]),
      styles: { font: "helvetica", fontSize: 7, cellPadding: 4, textColor: TEXT_COLOR },
      headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // Activity timeline
  if (activities.length) {
    if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Activity Timeline", 32, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: 32, right: 32 },
      theme: "grid",
      head: [["Date/Time", "User", "Node", "Action", "From", "To", "Duration", "Transition", "Remarks"]],
      body: activities.map(a => [
        formatDateTime(a.occurredAt), a.userName ?? "-", a.nodeName ?? "-", a.action,
        a.fromNodeName ?? "-", a.toNodeName ?? "-", formatDuration(a.durationSeconds), formatDuration(a.transitionSeconds), a.remarks ?? "-",
      ]),
      styles: { font: "helvetica", fontSize: 7, cellPadding: 4, textColor: TEXT_COLOR },
      headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // Flags
  if (flags.length) {
    if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Flags", 32, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: 32, right: 32 },
      theme: "grid",
      head: [["Node", "Description", "Status", "Raised By", "Resolved By", "Raised At", "Resolved At"]],
      body: flags.map(f => [f.nodeName ?? "-", f.description, f.status, f.raisedByName ?? "-", f.resolvedByName ?? "-", formatDateTime(f.createdAt), formatDateTime(f.resolvedAt)]),
      styles: { font: "helvetica", fontSize: 7, cellPadding: 4, textColor: TEXT_COLOR },
      headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // Approvals
  if (approvals.length) {
    if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Approvals", 32, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: 32, right: 32 },
      theme: "grid",
      head: [["Node", "Status", "Remarks", "Approved By", "Date"]],
      body: approvals.map(a => [a.nodeName ?? "-", a.status, a.remarks ?? "-", a.approvedByName ?? "-", formatDateTime(a.createdAt)]),
      styles: { font: "helvetica", fontSize: 7, cellPadding: 4, textColor: TEXT_COLOR },
      headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // Comments
  if (comments.length) {
    if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Comments", 32, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: 32, right: 32 },
      theme: "grid",
      head: [["Author", "Comment", "Date"]],
      body: comments.map(c => [c.authorName ?? "-", c.content, formatDateTime(c.createdAt)]),
      styles: { font: "helvetica", fontSize: 7, cellPadding: 4, textColor: TEXT_COLOR },
      headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // Audit log
  if (auditLogs.length) {
    if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Audit Log", 32, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: 32, right: 32 },
      theme: "grid",
      head: [["Action", "User", "Reference", "Date"]],
      body: auditLogs.map(a => [a.action, a.userName ?? "-", a.entityRef ?? "-", formatDateTime(a.createdAt)]),
      styles: { font: "helvetica", fontSize: 7, cellPadding: 4, textColor: TEXT_COLOR },
      headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 32, doc.internal.pageSize.getHeight() - 18, { align: "right" });
  }

  doc.save(`${project.projectNo}-project-report.pdf`);
}

export async function exportUserPDF(data: UserExportData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = new Date().toLocaleString();
  const { project, user, summary, activities, comments, flags, approvals } = data;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(`User Activity Report`, 32, 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(`${user.name}${user.employeeCode ? ` (${user.employeeCode})` : ""}`, 32, 54);
  doc.text(`Project: ${project.projectNo} - ${project.title}`, 32, 70);

  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`Generated: ${generatedAt}`, pageWidth - 32, 36, { align: "right" });

  let y = 90;

  autoTable(doc, {
    startY: y,
    margin: { left: 32, right: 32 },
    theme: "grid",
    head: [["Tasks Worked", "Comments", "Flags Raised", "Approvals", "Days Worked", "Total Hours"]],
    body: [[
      String(summary.tasksWorked), String(summary.commentsAdded), String(summary.flagsRaised),
      String(summary.approvalsPerformed), String(summary.daysWorked), `${summary.totalHoursWorked}h`,
    ]],
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4, textColor: TEXT_COLOR },
    headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  if (activities.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Activity Timeline", 32, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: 32, right: 32 },
      theme: "grid",
      head: [["Date/Time", "Node", "Action", "Duration", "Transition", "Remarks"]],
      body: activities.map(a => [formatDateTime(a.occurredAt), a.nodeName ?? "-", a.action, formatDuration(a.durationSeconds), formatDuration(a.transitionSeconds), a.remarks ?? "-"]),
      styles: { font: "helvetica", fontSize: 7, cellPadding: 4, textColor: TEXT_COLOR },
      headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  if (comments.length) {
    if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Comments", 32, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: 32, right: 32 },
      theme: "grid",
      head: [["Comment", "Date"]],
      body: comments.map(c => [c.content, formatDateTime(c.createdAt)]),
      styles: { font: "helvetica", fontSize: 7, cellPadding: 4, textColor: TEXT_COLOR },
      headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  if (flags.length) {
    if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Flags Raised", 32, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: 32, right: 32 },
      theme: "grid",
      head: [["Description", "Status", "Date"]],
      body: flags.map(f => [f.description, f.status, formatDateTime(f.createdAt)]),
      styles: { font: "helvetica", fontSize: 7, cellPadding: 4, textColor: TEXT_COLOR },
      headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  if (approvals.length) {
    if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Approvals Performed", 32, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: 32, right: 32 },
      theme: "grid",
      head: [["Status", "Remarks", "Date"]],
      body: approvals.map(a => [a.status, a.remarks ?? "-", formatDateTime(a.createdAt)]),
      styles: { font: "helvetica", fontSize: 7, cellPadding: 4, textColor: TEXT_COLOR },
      headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 32, doc.internal.pageSize.getHeight() - 18, { align: "right" });
  }

  doc.save(`${project.projectNo}-${user.name.replace(/\s+/g, "_")}-activity-report.pdf`);
}
