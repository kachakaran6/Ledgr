import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import { getDatabase } from '../db';
import type { ExportRequestInput, Subtask } from '@ledgr/shared';

export class ExportService {
  static async getExportData(userId: string, input: ExportRequestInput): Promise<{ subtasks: Subtask[]; userName: string; generatedAt: string }> {
    const db = getDatabase();
    const user = await db.getUserById(userId);
    const userName = user?.name || user?.email || 'User';
    const generatedAt = new Date().toISOString();

    let subtasks: Subtask[] = [];
    if (input.subtask_ids && input.subtask_ids.length > 0) {
      // Direct selected subtasks
      for (const id of input.subtask_ids) {
        const s = await db.getSubtaskById(userId, id);
        if (s) subtasks.push(s);
      }
    } else {
      // Filter-based subtasks
      const filter = {
        ...(input.filter || {}),
        page: 1,
        limit: 5000,
        sort_by: 'entry_date' as const,
        sort_dir: 'desc' as const,
        ...(input.title_ids && input.title_ids.length > 0 ? { title_ids: input.title_ids } : {})
      };
      const res = await db.getSubtasks(userId, filter);
      subtasks = res.items;
    }

    // Sort by entry_date descending
    subtasks.sort((a, b) => b.entry_date.localeCompare(a.entry_date));

    await db.createAuditLog(userId, 'EXPORT_DATA', 'export', null, {
      format: input.format,
      rowCount: subtasks.length
    });

    return { subtasks, userName, generatedAt };
  }

  static async generatePdf(userId: string, input: ExportRequestInput): Promise<Buffer> {
    const { subtasks, userName, generatedAt } = await this.getExportData(userId, input);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Document Header
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('LogPast — Proof of Work Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated for: ${userName}`, 14, 27);
    doc.text(`Generated on: ${new Date(generatedAt).toLocaleString()}`, 14, 32);
    doc.text(`Total Tasks: ${subtasks.length}`, 14, 37);

    // Group subtasks by Title
    const groupedByTitle = new Map<string, Subtask[]>();
    for (const st of subtasks) {
      const titleName = st.title?.name || 'General';
      if (!groupedByTitle.has(titleName)) {
        groupedByTitle.set(titleName, []);
      }
      groupedByTitle.get(titleName)!.push(st);
    }

    let startY = 44;

    for (const [titleName, tasks] of groupedByTitle.entries()) {
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175); // blue-800
      doc.text(titleName, 14, startY);
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
        startY: startY,
        head: [['Date', 'Task Description', 'Status', 'Tags', 'Cost', 'Time']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59], // slate-800
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          startY = data.cursor?.y ? data.cursor.y + 10 : 20;
        }
      });

      startY = (doc as any).lastAutoTable.finalY + 8;
    }

    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
  }

  static async generateExcel(userId: string, input: ExportRequestInput): Promise<Buffer> {
    const { subtasks, userName, generatedAt } = await this.getExportData(userId, input);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = userName || 'LogPast';
    workbook.created = new Date(generatedAt);

    const worksheet = workbook.addWorksheet('Work Log');

    // Define Columns
    worksheet.columns = [
      { header: 'Title', key: 'title', width: 24 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Task Description', key: 'description', width: 45 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Tags', key: 'tags', width: 20 },
      { header: 'Cost ($)', key: 'cost', width: 14 },
      { header: 'Time Spent (min)', key: 'time_spent', width: 18 },
      { header: 'Logged At', key: 'created_at', width: 22 }
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // slate-800
    };
    headerRow.alignment = { vertical: 'middle' };

    // Add Rows
    for (const t of subtasks) {
      worksheet.addRow({
        title: t.title?.name || 'General',
        date: t.entry_date,
        description: t.description,
        status: t.status.toUpperCase(),
        tags: t.tags.join(', '),
        cost: t.cost ?? '',
        time_spent: t.time_spent_minutes ?? '',
        created_at: new Date(t.created_at).toLocaleString()
      });
    }

    // Freeze header
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  static async generateCsv(userId: string, input: ExportRequestInput): Promise<string> {
    const { subtasks } = await this.getExportData(userId, input);

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

    return stringify(rows, { header: true });
  }
}
