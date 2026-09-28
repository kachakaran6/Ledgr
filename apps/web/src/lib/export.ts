/**
 * Client-side export module.
 *
 * Routes all PDF and Excel exports through the server API (pdfmake + exceljs),
 * with a fallback for CSV. The client never generates PDFs or Excel itself.
 *
 * Triggers a confetti micro-interaction on success.
 */

import confetti from 'canvas-confetti';
import { api, ApiError } from './api';
import type { Subtask, ExportFormat } from '@ledgr/shared';

export interface ExportOptions {
  format: ExportFormat;
  subtasks: Subtask[];
  userName?: string;
  filenamePrefix?: string;
  /** Optional: pass explicit subtask IDs to export (server will re-verify ownership) */
  subtaskIds?: string[];
  /** Optional: pass filter params so server re-runs the same query */
  titleIds?: string[];
}

/**
 * Main export entry point.
 * Calls the server API to generate PDF or Excel, downloads the result.
 * Falls back to a client-side CSV if the server is unavailable.
 */
export async function exportDocuments({
  format,
  subtasks,
  subtaskIds,
  titleIds,
}: ExportOptions): Promise<void> {
  if (subtasks.length === 0) {
    throw new Error('No entries selected. Please select or filter at least one entry to export.');
  }

  if (format === 'pdf' || format === 'xlsx') {
    await exportViaServer(format, subtasks, subtaskIds, titleIds);
  } else if (format === 'csv') {
    await exportCsvViaServer(subtasks, subtaskIds, titleIds);
  }

  // Confetti micro-interaction on success
  try {
    confetti({ particleCount: 45, spread: 65, origin: { y: 0.85 } });
  } catch {
    // ignore confetti errors
  }
}

/**
 * Call the server API to generate and download PDF or Excel.
 */
async function exportViaServer(
  format: 'pdf' | 'xlsx',
  subtasks: Subtask[],
  subtaskIds?: string[],
  titleIds?: string[]
): Promise<void> {
  const endpoint = format === 'pdf' ? '/export/pdf' : '/export/xlsx';
  const mimeType = format === 'pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  // Build the request body. If we have explicit IDs, send those so the server
  // can re-verify ownership. Otherwise send the title filters so the server
  // re-runs the same query.
  const body: Record<string, unknown> = { format };
  if (subtaskIds && subtaskIds.length > 0) {
    body.subtask_ids = subtaskIds;
  } else if (titleIds && titleIds.length > 0) {
    body.title_ids = titleIds;
  }
  // Always include subtask_ids as fallback if server-side filter isn't enough
  if (!body.subtask_ids && subtasks.length > 0 && subtasks.length <= 500) {
    body.subtask_ids = subtasks.map(s => s.id);
  }

  const token = api.getToken();
  const res = await fetch(`/api${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Try to read the error body
    let errorMsg = `Export failed (HTTP ${res.status})`;
    try {
      const json = await res.json();
      if (json?.message) errorMsg = json.message;
      else if (json?.error?.message) errorMsg = json.error.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(errorMsg);
  }

  // Extract filename from Content-Disposition header if present
  const disposition = res.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
  const filename = filenameMatch?.[1] || `ledgr-export-${Date.now()}.${format}`;

  const blob = await res.blob();
  triggerDownload(blob, filename, mimeType);
}

/**
 * Export CSV via server (cleaner escaping than client-side).
 */
async function exportCsvViaServer(
  subtasks: Subtask[],
  subtaskIds?: string[],
  titleIds?: string[]
): Promise<void> {
  const body: Record<string, unknown> = { format: 'csv' };
  if (subtaskIds && subtaskIds.length > 0) {
    body.subtask_ids = subtaskIds;
  } else if (titleIds && titleIds.length > 0) {
    body.title_ids = titleIds;
  } else if (subtasks.length > 0 && subtasks.length <= 500) {
    body.subtask_ids = subtasks.map(s => s.id);
  }

  const token = api.getToken();
  const res = await fetch('/api/export/csv', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorMsg = `Export failed (HTTP ${res.status})`;
    try {
      const json = await res.json();
      if (json?.message) errorMsg = json.message;
    } catch {}
    throw new Error(errorMsg);
  }

  const disposition = res.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
  const filename = filenameMatch?.[1] || `ledgr-export-${Date.now()}.csv`;

  const csvText = await res.text();
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename, 'text/csv');
}

/**
 * Trigger a browser download from a Blob.
 */
function triggerDownload(blob: Blob, filename: string, _mimeType: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
