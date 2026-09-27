import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import type { Subtask, ExportFormat } from '@ledgr/shared';

export interface ExportOptions {
  format: ExportFormat;
  subtasks: Subtask[];
  userName?: string;
  filenamePrefix?: string;
}

export async function exportDocuments({ format, subtasks, userName = 'Technician', filenamePrefix = 'logpast-export' }: ExportOptions) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}-${timestamp}`;

  if (format === 'pdf') {
    await exportClientPdf(subtasks, userName, filename);
  } else if (format === 'xlsx') {
    exportClientExcel(subtasks, filename);
  } else if (format === 'csv') {
    exportClientCsv(subtasks, filename);
  }

  // Trigger celebration micro-interaction
  try {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.85 }
    });
  } catch {
    // Ignore confetti errors
  }
}

function exportClientPdf(subtasks: Subtask[], userName: string, filename: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header Styling
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('LogPast — Proof of Work', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Technician / User: ${userName}`, 14, 28);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 33);
  doc.text(`Total Tasks Logged: ${subtasks.length}`, 14, 38);

  // Group by Title
  const grouped = new Map<string, Subtask[]>();
  for (const st of subtasks) {
    const title = st.title?.name || 'General';
    if (!grouped.has(title)) grouped.set(title, []);
    grouped.get(title)!.push(st);
  }

  let startY = 46;

  for (const [titleName, tasks] of grouped.entries()) {
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(13);
    doc.setTextColor(37, 99, 235); // brand-600
    doc.text(`• ${titleName} (${tasks.length})`, 14, startY);
    startY += 4;

    const tableData = tasks.map((t) => [
      t.entry_date,
      t.description,
      t.status.toUpperCase(),
      t.tags.join(', ') || '-',
      t.cost != null ? `$${t.cost.toFixed(2)}` : '-',
      t.time_spent_minutes != null ? `${t.time_spent_minutes}m` : '-'
    ]);

    autoTable(doc, {
      startY,
      head: [['Date', 'Task Description', 'Status', 'Tags', 'Cost', 'Time']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [30, 41, 59]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 }
    });

    startY = (doc as any).lastAutoTable.finalY + 8;
  }

  doc.save(`${filename}.pdf`);
}

function exportClientExcel(subtasks: Subtask[], filename: string) {
  const rows = subtasks.map((t) => ({
    Title: t.title?.name || 'General',
    Date: t.entry_date,
    Description: t.description,
    Status: t.status.toUpperCase(),
    Tags: t.tags.join(', '),
    'Cost ($)': t.cost ?? '',
    'Time Spent (min)': t.time_spent_minutes ?? '',
    'Created At': new Date(t.created_at).toLocaleString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Work Log');

  // Auto-fit column widths
  const colWidths = [
    { wch: 20 },
    { wch: 14 },
    { wch: 45 },
    { wch: 12 },
    { wch: 20 },
    { wch: 12 },
    { wch: 16 },
    { wch: 22 }
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function exportClientCsv(subtasks: Subtask[], filename: string) {
  const rows = subtasks.map((t) => ({
    Title: t.title?.name || 'General',
    Date: t.entry_date,
    Description: t.description,
    Status: t.status,
    Tags: t.tags.join('; '),
    Cost: t.cost ?? '',
    TimeSpentMinutes: t.time_spent_minutes ?? '',
    CreatedAt: t.created_at
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
