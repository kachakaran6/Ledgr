/**
 * Export Service — production-grade PDF and Excel generation.
 *
 * PDF: uses pdfmake (declarative, deterministic, server-side, no headless browser).
 * Excel: uses exceljs (proper native types, styled, auto-sized columns).
 *
 * Both formats:
 *  - Re-verify ownership server-side for every entry before including it.
 *  - Throw a loud 400 if zero entries match (never produce empty/malformed files).
 *  - Descriptive filenames, date range–aware.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import ExcelJS from 'exceljs';
import { getDatabase } from '../db/index.js';
import type { ExportRequestInput, Subtask } from '@ledgr/shared';

// ─── Font paths (resolved dynamically with bulletproof fallbacks) ───────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

function findExistingPath(candidates: (string | undefined)[]): string | null {
  for (const c of candidates) {
    if (!c) continue;
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      // ignore access error
    }
  }
  return null;
}

function resolveDejaVuFont(file: string): string | null {
  try {
    return require.resolve(`dejavu-fonts-ttf/ttf/${file}`);
  } catch {
    // ignore
  }
  return findExistingPath([
    path.resolve(process.cwd(), 'node_modules', 'dejavu-fonts-ttf', 'ttf', file),
    path.resolve(process.cwd(), 'apps', 'api', 'node_modules', 'dejavu-fonts-ttf', 'ttf', file),
    path.resolve(__dirname, 'node_modules', 'dejavu-fonts-ttf', 'ttf', file),
    path.resolve(__dirname, '..', 'node_modules', 'dejavu-fonts-ttf', 'ttf', file),
    path.resolve(__dirname, '..', '..', 'node_modules', 'dejavu-fonts-ttf', 'ttf', file),
    path.resolve(__dirname, '..', '..', '..', 'node_modules', 'dejavu-fonts-ttf', 'ttf', file),
  ]);
}

function resolveLocalFont(file: string): string | null {
  return findExistingPath([
    path.resolve(process.cwd(), 'fonts', file),
    path.resolve(process.cwd(), 'apps', 'api', 'fonts', file),
    path.resolve(__dirname, 'fonts', file),
    path.resolve(__dirname, '..', 'fonts', file),
    path.resolve(__dirname, '..', '..', 'fonts', file),
    path.resolve(__dirname, '..', '..', '..', 'fonts', file),
    path.resolve(__dirname, '..', '..', '..', 'apps', 'api', 'fonts', file),
  ]);
}

function getPdfFonts() {
  const dejavuNormal = resolveDejaVuFont('DejaVuSans.ttf');
  const dejavuBold = resolveDejaVuFont('DejaVuSans-Bold.ttf') || dejavuNormal;
  const dejavuItalics = resolveDejaVuFont('DejaVuSans-Oblique.ttf') || dejavuNormal;
  const dejavuBoldItalics = resolveDejaVuFont('DejaVuSans-BoldOblique.ttf') || dejavuNormal;

  const notoDevanagari = resolveLocalFont('NotoSansDevanagari.ttf');
  const notoGujarati = resolveLocalFont('NotoSansGujarati.ttf');

  const fonts: Record<string, any> = {
    // Built-in standard PDF fallback (always available in pdfmake, no external files needed)
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
  };

  let defaultFont = 'Helvetica';

  if (dejavuNormal) {
    fonts.DejaVu = {
      normal: dejavuNormal,
      bold: dejavuBold || dejavuNormal,
      italics: dejavuItalics || dejavuNormal,
      bolditalics: dejavuBoldItalics || dejavuNormal,
    };
    defaultFont = 'DejaVu';
  }

  const hasDevanagari = Boolean(notoDevanagari);
  if (notoDevanagari) {
    fonts.Devanagari = {
      normal: notoDevanagari,
      bold: notoDevanagari,
      italics: notoDevanagari,
      bolditalics: notoDevanagari,
    };
  }

  const hasGujarati = Boolean(notoGujarati);
  if (notoGujarati) {
    fonts.Gujarati = {
      normal: notoGujarati,
      bold: notoGujarati,
      italics: notoGujarati,
      bolditalics: notoGujarati,
    };
  }

  return { fonts, defaultFont, hasDevanagari, hasGujarati };
}

// Brand colors
const COLOR = {
  INK:        '#26241F',  // warm near-black
  MUTED:      '#6B6558',  // muted foreground
  ACCENT:     '#B5502E',  // burnt terracotta
  RULE:       '#E8E1D3',  // warm border
  PAPER:      '#FAF7F0',  // warm background
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format a cost value safely into "$XX.XX" (or empty string if not set).
 * Defensively handles numbers, strings (e.g. from Postgres NUMERIC), null, or undefined.
 */
function formatCost(cost: unknown): string {
  if (cost == null || cost === '') return '';
  const num = typeof cost === 'number' ? cost : parseFloat(String(cost));
  return isNaN(num) ? '' : `$${num.toFixed(2)}`;
}

/**
 * Format a raw cost without currency symbol for CSV.
 */
function formatCostRaw(cost: unknown): string {
  if (cost == null || cost === '') return '';
  const num = typeof cost === 'number' ? cost : parseFloat(String(cost));
  return isNaN(num) ? '' : num.toFixed(2);
}

/**
 * Parse cost safely to number or null.
 */
function parseCostNumber(cost: unknown): number | null {
  if (cost == null || cost === '') return null;
  const num = typeof cost === 'number' ? cost : parseFloat(String(cost));
  return isNaN(num) ? null : num;
}

/**
 * Format time spent in minutes safely into "XXm" (or empty string if not set).
 */
function formatTime(time: unknown): string {
  if (time == null || time === '') return '';
  const num = typeof time === 'number' ? time : parseInt(String(time), 10);
  return isNaN(num) ? '' : `${num}m`;
}

/**
 * Parse time spent safely to number or null.
 */
function parseTimeNumber(time: unknown): number | null {
  if (time == null || time === '') return null;
  const num = typeof time === 'number' ? time : parseInt(String(time), 10);
  return isNaN(num) ? null : num;
}

/**
 * Format tags safely into a joined string.
 * Handles arrays, comma-separated strings, or Postgres array string syntax ("{tag1,tag2}").
 */
function formatTags(tags: unknown, separator = ', '): string {
  if (!tags) return '';
  if (Array.isArray(tags)) return tags.filter(Boolean).join(separator);
  if (typeof tags === 'string') {
    const cleaned = tags.replace(/^\{|\}$/g, '').replace(/"/g, '').trim();
    if (!cleaned) return '';
    if (separator !== ', ' && cleaned.includes(',')) {
      return cleaned.split(',').map(s => s.trim()).filter(Boolean).join(separator);
    }
    return cleaned;
  }
  return String(tags);
}

/**
 * Format a YYYY-MM-DD string to a display string like "28 Sep 2026".
 */
function fmtDate(dateStr: unknown): string {
  if (!dateStr) return '';
  const str = typeof dateStr === 'string'
    ? dateStr
    : dateStr instanceof Date
      ? dateStr.toISOString().split('T')[0]!
      : String(dateStr);
  try {
    const clean = str.split('T')[0]!;
    const [y, m, d] = clean.split('-').map(Number);
    if (!y || !m || !d) return clean;
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Safely parse entry_date into a JS Date object.
 */
function parseEntryDate(dateStr: unknown): Date {
  if (dateStr instanceof Date) return dateStr;
  const str = typeof dateStr === 'string' ? dateStr.split('T')[0]! : '';
  const [y, m, d] = str.split('-').map(Number);
  if (y && m && d) {
    return new Date(y, m - 1, d);
  }
  return new Date();
}

/**
 * Build a human-readable date range string from an array of entry dates.
 * e.g. "Sep 21 – Sep 28, 2026" or "Sep 28, 2026" for single-day.
 */
function buildDateRange(subtasks: Subtask[]): string {
  if (subtasks.length === 0) return '';
  const dates = subtasks
    .map(s => typeof s.entry_date === 'string' ? s.entry_date.split('T')[0]! : new Date(s.entry_date).toISOString().split('T')[0]!)
    .filter(Boolean)
    .sort();
  if (dates.length === 0) return '';
  const earliest = dates[0]!;
  const latest = dates[dates.length - 1]!;
  if (earliest === latest) return fmtDate(earliest);
  const fmt = (d: string) => {
    try {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y!, m! - 1, day!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return d;
    }
  };
  try {
    const [ly, lm, ld] = latest.split('-').map(Number);
    return `${fmt(earliest)} – ${fmt(latest)}, ${new Date(ly!, lm! - 1, ld!).getFullYear()}`;
  } catch {
    return `${fmt(earliest)} – ${fmt(latest)}`;
  }
}

/**
 * Build a safe filename segment (strip special chars, collapse spaces).
 */
function safeSegment(s: string, maxLen = 30): string {
  return s.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-').substring(0, maxLen).toLowerCase();
}

/**
 * Build the descriptive export filename (without extension).
 * Pattern: ledgr-export-{titleOrAll}-{daterange}-{YYYYMMDD}
 */
function buildFilename(subtasks: Subtask[], titleNames: string[]): string {
  const today = new Date().toISOString().split('T')[0]!.replace(/-/g, '');
  const titlePart = titleNames.length === 1 ? safeSegment(titleNames[0]!) : 'all';
  const dates = subtasks
    .map(s => typeof s.entry_date === 'string' ? s.entry_date.split('T')[0]! : new Date(s.entry_date).toISOString().split('T')[0]!)
    .filter(Boolean)
    .sort();
  let datePart = '';
  if (dates.length > 0) {
    const fmt = (d: string) => {
      try {
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y!, m! - 1, day!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase().replace(/\s/g, '');
      } catch {
        return safeSegment(d, 10);
      }
    };
    const earliest = dates[0]!;
    const latest = dates[dates.length - 1]!;
    datePart = earliest === latest ? safeSegment(fmtDate(earliest), 15) : `${fmt(earliest)}-to-${fmt(latest)}`;
  }
  return `ledgr-export-${titlePart}${datePart ? '-' + datePart : ''}-${today}`;
}

/**
 * Determine whether all subtasks across the export have any cost / time / tags.
 * Used to decide which columns to include in the PDF table.
 */
function detectColumns(subtasks: Subtask[]) {
  return {
    hasCost: subtasks.some(s => s.cost != null && (s.cost as any) !== '' && !isNaN(Number(s.cost))),
    hasTime: subtasks.some(s => s.time_spent_minutes != null && (s.time_spent_minutes as any) !== '' && !isNaN(Number(s.time_spent_minutes))),
    hasTags: subtasks.some(s => Array.isArray(s.tags) ? s.tags.length > 0 : Boolean(s.tags && (s.tags as any) !== '{}')),
  };
}

/**
 * Tokenize a string into pdfmake inline text segments for multi-script support.
 * Latin/symbols → Default font (DejaVu or Helvetica fallback).
 * Devanagari → Devanagari font (if available).
 * Gujarati → Gujarati font (if available).
 */
function richText(
  text: string,
  baseStyle?: Record<string, unknown>,
  options?: { hasDevanagari?: boolean; hasGujarati?: boolean }
): unknown {
  if (!text) return { text: '', ...baseStyle };

  const devanagariRe = /[\u0900-\u097F]/;
  const gujaratiRe   = /[\u0A80-\u0AFF]/;
  const hasDev = Boolean(options?.hasDevanagari) && devanagariRe.test(text);
  const hasGuj = Boolean(options?.hasGujarati) && gujaratiRe.test(text);
  const needsSplit = hasDev || hasGuj;
  if (!needsSplit) return { text, ...baseStyle };

  const tokenRe = /([\u0900-\u097F]+|[\u0A80-\u0AFF]+|[^\u0900-\u097F\u0A80-\u0AFF]+)/g;
  const parts: unknown[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(text)) !== null) {
    const chunk = m[0]!;
    if (options?.hasDevanagari && devanagariRe.test(chunk)) {
      parts.push({ text: chunk, font: 'Devanagari', ...baseStyle });
    } else if (options?.hasGujarati && gujaratiRe.test(chunk)) {
      parts.push({ text: chunk, font: 'Gujarati', ...baseStyle });
    } else {
      parts.push({ text: chunk, ...baseStyle });
    }
  }
  return { text: parts, ...baseStyle };
}

// ─── Data layer ───────────────────────────────────────────────────────────────

export interface ExportData {
  subtasks: Subtask[];
  userName: string;
  generatedAt: string;
  filename: string;
  dateRange: string;
  titleNames: string[];
}

export class ExportService {
  /**
   * Fetch, validate, and sort the export dataset.
   * Throws a descriptive error if 0 entries match.
   */
  static async getExportData(userId: string, input: ExportRequestInput): Promise<ExportData> {
    const db = getDatabase();
    let userName = 'Technician';
    try {
      const user = await db.getUserById(userId);
      userName = user?.name || user?.email || 'Technician';
    } catch {
      // Non-fatal
    }
    const generatedAt = new Date().toISOString();

    let subtasks: Subtask[] = [];

    if (input.subtask_ids && input.subtask_ids.length > 0) {
      // Explicit ID list — re-verify ownership per entry
      for (const id of input.subtask_ids) {
        try {
          const s = await db.getSubtaskById(userId, id);
          if (s) subtasks.push(s);
        } catch {
          // silently skip IDs that fail or don't belong to this user
        }
      }
    } else {
      // Filter-based fetch
      const filter = {
        ...(input.filter || {}),
        page: 1,
        limit: 5000,
        sort_by: 'entry_date' as const,
        sort_dir: 'desc' as const,
        ...(input.title_ids && input.title_ids.length > 0 ? { title_ids: input.title_ids } : {}),
      };
      const res = await db.getSubtasks(userId, filter);
      subtasks = res.items || [];
    }

    if (subtasks.length === 0) {
      throw new Error('NO_ENTRIES: No entries match the selected filters. Please adjust your selection and try again.');
    }

    // Stable sort by entry_date desc, then created_at desc
    subtasks.sort((a, b) => {
      const aDate = typeof a.entry_date === 'string' ? a.entry_date : '';
      const bDate = typeof b.entry_date === 'string' ? b.entry_date : '';
      const dateCmp = bDate.localeCompare(aDate);
      if (dateCmp !== 0) return dateCmp;
      const aCreated = typeof a.created_at === 'string' ? a.created_at : '';
      const bCreated = typeof b.created_at === 'string' ? b.created_at : '';
      return bCreated.localeCompare(aCreated);
    });

    const titleNames = [...new Set(subtasks.map(s => s.title?.name || 'General'))];
    const filename = buildFilename(subtasks, titleNames);
    const dateRange = buildDateRange(subtasks);

    try {
      await db.createAuditLog(userId, 'EXPORT_DATA', 'export', null, {
        format: input.format,
        rowCount: subtasks.length,
        filename,
      });
    } catch (auditErr) {
      // Non-fatal: do not block export if audit logging fails
      console.warn('Failed to record export audit log:', auditErr);
    }

    return { subtasks, userName, generatedAt, filename, dateRange, titleNames };
  }

  // ─── PDF Generation ─────────────────────────────────────────────────────────

  static async generatePdf(userId: string, input: ExportRequestInput): Promise<{ buffer: Buffer; filename: string }> {
    const { subtasks, userName, generatedAt, filename, dateRange } = await this.getExportData(userId, input);
    const { hasCost, hasTime, hasTags } = detectColumns(subtasks);

    // Lazy import pdfmake (CJS module via dynamic import)
    const pdfmakeModule = await import('pdfmake');
    const pdfmake = (pdfmakeModule as any).default || pdfmakeModule;

    const { fonts, defaultFont, hasDevanagari, hasGujarati } = getPdfFonts();
    const fontOpts = { hasDevanagari, hasGujarati };

    pdfmake.setUrlAccessPolicy(() => false);   // no external URLs in server context
    pdfmake.setLocalAccessPolicy(() => true);  // allow local font files
    pdfmake.fonts = fonts;

    // Group by title, preserving sorted order
    const groups = new Map<string, Subtask[]>();
    for (const s of subtasks) {
      const titleName = s.title?.name || 'General';
      if (!groups.has(titleName)) groups.set(titleName, []);
      groups.get(titleName)!.push(s);
    }

    // Build column definitions based on available data
    const colHeaders: unknown[] = [
      { text: 'Date',        bold: true, fillColor: COLOR.INK, color: '#FFFFFF', fontSize: 8 },
      { text: 'Description', bold: true, fillColor: COLOR.INK, color: '#FFFFFF', fontSize: 8 },
      { text: 'Status',      bold: true, fillColor: COLOR.INK, color: '#FFFFFF', fontSize: 8 },
    ];
    const colWidths: (string | number)[] = ['auto', '*', 'auto'];
    if (hasTags) { colHeaders.push({ text: 'Tags', bold: true, fillColor: COLOR.INK, color: '#FFFFFF', fontSize: 8 }); colWidths.push('auto'); }
    if (hasCost) { colHeaders.push({ text: 'Cost', bold: true, fillColor: COLOR.INK, color: '#FFFFFF', fontSize: 8 }); colWidths.push('auto'); }
    if (hasTime) { colHeaders.push({ text: 'Time', bold: true, fillColor: COLOR.INK, color: '#FFFFFF', fontSize: 8 }); colWidths.push('auto'); }

    // Build body content
    const bodyContent: unknown[] = [];

    for (const [titleName, tasks] of groups.entries()) {
      const tableBody: unknown[][] = [colHeaders];

      for (const t of tasks) {
        const row: unknown[] = [
          { text: fmtDate(t.entry_date), fontSize: 8, color: COLOR.INK, noWrap: true },
          richText(t.description || '', { fontSize: 8, color: COLOR.INK }, fontOpts),
          { text: statusLabel(t.status), fontSize: 8, color: COLOR.MUTED, noWrap: true },
        ];
        if (hasTags)  row.push({ text: formatTags(t.tags), fontSize: 7.5, color: COLOR.MUTED });
        if (hasCost)  row.push({ text: formatCost(t.cost), fontSize: 8, color: COLOR.INK, noWrap: true });
        if (hasTime)  row.push({ text: formatTime(t.time_spent_minutes), fontSize: 8, color: COLOR.MUTED, noWrap: true });
        tableBody.push(row);
      }

      // Keep heading + first entry together via unbreakable stack
      bodyContent.push({
        unbreakable: true,
        stack: [
          {
            columns: [
              {
                text: [
                  richText(titleName, { bold: true, fontSize: 11, color: COLOR.ACCENT }, fontOpts) as any,
                  { text: `  (${tasks.length} ${tasks.length === 1 ? 'entry' : 'entries'})`, fontSize: 9, color: COLOR.MUTED },
                ],
              },
            ],
            margin: [0, 10, 0, 4],
          },
          {
            layout: {
              hLineWidth: (i: number, _node: unknown) => (i === 0 || i === 1) ? 1 : 0.5,
              vLineWidth: () => 0,
              hLineColor: (i: number) => i === 0 || i === 1 ? COLOR.INK : COLOR.RULE,
              paddingLeft:   () => 6,
              paddingRight:  () => 6,
              paddingTop:    () => 4,
              paddingBottom: () => 4,
              fillColor: (_i: number, _node: unknown, _col: number, rowIndex: number) =>
                rowIndex % 2 === 0 ? COLOR.PAPER : null,
            },
            table: {
              headerRows: 1,
              dontBreakRows: true,
              widths: colWidths,
              body: tableBody,
            },
          },
        ],
      });
    }

    const docDef = {
      pageSize: 'A4' as const,
      pageOrientation: 'portrait' as const,
      pageMargins: [36, 50, 36, 50] as [number, number, number, number],
      defaultStyle: { font: defaultFont, fontSize: 9, color: COLOR.INK },

      header: (_currentPage: number, _pageCount: number, _pageSize: { width: number; height: number }) => ({
        margin: [36, 16, 36, 0],
        columns: [
          {
            stack: [
              { text: 'Ledgr', bold: true, fontSize: 14, color: COLOR.ACCENT },
              { text: 'Work Log Report', fontSize: 9, color: COLOR.MUTED },
            ],
          },
          {
            stack: [
              { text: dateRange, fontSize: 9, color: COLOR.MUTED, alignment: 'right' },
              richText(`Exported for: ${userName}`, { fontSize: 8, color: COLOR.MUTED, alignment: 'right' }, fontOpts) as any,
            ],
          },
        ],
      }),

      footer: (currentPage: number, pageCount: number) => ({
        margin: [36, 0, 36, 12],
        columns: [
          {
            text: currentPage > 1 ? dateRange : '',
            fontSize: 7.5,
            color: COLOR.MUTED,
          },
          {
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: 'right',
            fontSize: 8,
            color: COLOR.MUTED,
          },
        ],
      }),

      content: [
        // Document header summary
        {
          canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 522, y2: 0, lineWidth: 1.5, lineColor: COLOR.ACCENT },
          ],
          margin: [0, 0, 0, 8],
        },
        {
          columns: [
            [
              { text: `${subtasks.length} work entries`, bold: true, fontSize: 13, color: COLOR.INK },
              { text: dateRange, fontSize: 9.5, color: COLOR.MUTED, margin: [0, 2, 0, 0] },
            ],
            {
              text: `Generated: ${new Date(generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`,
              alignment: 'right',
              fontSize: 8,
              color: COLOR.MUTED,
            },
          ],
          margin: [0, 0, 0, 4],
        },
        {
          canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 522, y2: 0, lineWidth: 0.5, lineColor: COLOR.RULE },
          ],
          margin: [0, 0, 0, 4],
        },

        // Body (title groups with their tables)
        ...bodyContent,
      ],
    };

    const pdfDoc = pdfmake.createPdf(docDef);
    const buffer: Buffer = await pdfDoc.getBuffer();

    return { buffer, filename };
  }

  // ─── Excel Generation ───────────────────────────────────────────────────────

  static async generateExcel(userId: string, input: ExportRequestInput): Promise<{ buffer: Buffer; filename: string }> {
    const { subtasks, generatedAt, filename, dateRange, titleNames } = await this.getExportData(userId, input);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Ledgr';
    workbook.created = new Date(generatedAt);

    // Dynamic sheet name: "HVAC - Sep 2026" or "All - Last 7 Days" (max 31 chars, no invalid chars)
    const sheetName = buildSheetName(titleNames, dateRange);
    const worksheet = workbook.addWorksheet(sheetName);

    // Fixed column order per spec
    worksheet.columns = [
      { header: 'Title',           key: 'title',        width: 24 },
      { header: 'Description',     key: 'description',  width: 48 },
      { header: 'Date',            key: 'date',         width: 14 },
      { header: 'Status',          key: 'status',       width: 14 },
      { header: 'Tags',            key: 'tags',         width: 22 },
      { header: 'Cost',            key: 'cost',         width: 14 },
      { header: 'Time Spent (min)', key: 'time_spent', width: 18 },
    ];

    // Styled frozen header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF26241F' } }; // warm ink
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FFB5502E' } }, // terracotta bottom border
      };
    });

    // Track max content widths for auto-sizing
    const colMaxWidths = [24, 48, 14, 14, 22, 14, 18];

    // Data rows
    for (const t of subtasks) {
      const entryDate = parseEntryDate(t.entry_date);
      const numCost = parseCostNumber(t.cost);
      const numTime = parseTimeNumber(t.time_spent_minutes);
      const tagsStr = formatTags(t.tags);

      const row = worksheet.addRow({
        title:       t.title?.name || 'General',
        description: t.description || '',
        date:        entryDate,                    // native Date type → Excel date cell
        status:      statusLabel(t.status),
        tags:        tagsStr || null,              // null → empty cell (not "")
        cost:        numCost,                      // null → empty cell
        time_spent:  numTime,                      // null → empty cell
      });

      // Format date column as date
      row.getCell('date').numFmt = 'DD MMM YYYY';

      // Format cost as currency
      if (numCost != null) {
        row.getCell('cost').numFmt = '$#,##0.00';
      }

      // Alternate row fill
      const isEven = (worksheet.rowCount % 2 === 0);
      if (isEven) {
        row.eachCell({ includeEmpty: false }, (cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF7F0' } };
        });
      }

      // Track max widths for auto-sizing
      const rowValues = [
        t.title?.name || 'General',
        t.description || '',
        fmtDate(t.entry_date),
        statusLabel(t.status),
        tagsStr,
        formatCost(t.cost),
        formatTime(t.time_spent_minutes),
      ];
      rowValues.forEach((v, i) => {
        if (v) colMaxWidths[i] = Math.max(colMaxWidths[i]!, Math.min(v.length + 4, 60));
      });
    }

    // Apply auto-sized widths
    worksheet.columns.forEach((col, i) => {
      if (col) col.width = colMaxWidths[i];
    });

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Auto-filter on header row
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to:   { row: 1, column: worksheet.columns.length },
    };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return { buffer, filename };
  }

  // ─── CSV Generation ─────────────────────────────────────────────────────────

  static async generateCsv(userId: string, input: ExportRequestInput): Promise<{ content: string; filename: string }> {
    const { subtasks, filename } = await this.getExportData(userId, input);

    const headers = ['Title', 'Description', 'Date', 'Status', 'Tags', 'Cost', 'Time Spent (min)'];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

    const rows = subtasks.map(t => [
      escape(t.title?.name || 'General'),
      escape(t.description || ''),
      fmtDate(t.entry_date),
      escape(statusLabel(t.status)),
      escape(formatTags(t.tags, '; ')),
      formatCostRaw(t.cost),
      t.time_spent_minutes != null && (t.time_spent_minutes as any) !== '' ? String(t.time_spent_minutes) : '',
    ].join(','));

    const content = [headers.join(','), ...rows].join('\n');
    return { content, filename };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(s: string): string {
  if (s === 'done') return 'Done';
  if (s === 'in_progress') return 'In Progress';
  if (s === 'cancelled') return 'Cancelled';
  return s;
}

function buildSheetName(titleNames: string[], dateRange: string): string {
  // Max 31 chars; strip invalid Excel sheet name chars: [ ] : * ? / \
  const base = titleNames.length === 1
    ? `${titleNames[0]} - ${dateRange}`
    : `All Titles - ${dateRange}`;
  return base
    .replace(/[\[\]:*?/\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 31);
}
