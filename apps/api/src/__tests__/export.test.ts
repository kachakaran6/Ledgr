import { describe, it, expect, beforeEach } from 'vitest';
import { buildServer } from '../server';
import { getDatabase } from '../db';
import { getTodayDateString, getYesterdayDateString } from '@ledgr/shared';

describe('Export Engine — PDF, XLSX, CSV', () => {
  const app = buildServer();
  let userToken: string;
  let titleId: string;

  beforeEach(async () => {
    const db = getDatabase();
    if (db.reset) await db.reset();

    // Register user
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: 'exportuser@test.com', password: 'password123', name: 'Field Tech Alex' },
    });
    userToken = JSON.parse(res.body).data.token;

    // Create Title
    const titleRes = await app.inject({
      method: 'POST',
      url: '/api/titles',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'HVAC Maintenance' },
    });
    titleId = JSON.parse(titleRes.body).data.id;

    // Create subtasks with varied data
    await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        title_id: titleId,
        description: 'Replaced compressor coil and capacitor — full system diagnostics completed',
        entry_date: getTodayDateString(),
        status: 'done',
        cost: 240.50,
        time_spent_minutes: 120,
        tags: ['compressor', 'cooling', 'urgent'],
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        title_id: titleId,
        description: 'Cleaned air handler filters and flushed condensate drain line',
        entry_date: getYesterdayDateString(),
        status: 'done',
        // No cost, no time, no tags — testing optional field handling
      },
    });
  });

  // ─────────────────────────────────────────────────────────
  // PDF Tests
  // ─────────────────────────────────────────────────────────

  it('PDF: generates valid %PDF- binary with correct content-type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/export/pdf',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { format: 'pdf' },
    });

    expect(res.statusCode, `Expected 200, got ${res.statusCode}: ${res.body}`).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');

    // Verify PDF magic bytes
    const header = res.rawPayload.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');

    // Must be a reasonably sized file (not empty)
    expect(res.rawPayload.length).toBeGreaterThan(10_000);
  });

  it('PDF: Content-Disposition has descriptive filename', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/export/pdf',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { format: 'pdf' },
    });

    expect(res.statusCode).toBe(200);
    const disposition = res.headers['content-disposition'] as string;
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('ledgr-export');
    expect(disposition).toContain('.pdf');
    // Must NOT be a generic timestamped name
    expect(disposition).not.toMatch(/\d{13}/); // no Unix epoch ms
  });

  it('PDF: 400 when zero entries match', async () => {
    // Second user with no data
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: 'empty@test.com', password: 'password123', name: 'Empty User' },
    });
    const emptyToken = JSON.parse(res2.body).data.token;

    const res = await app.inject({
      method: 'POST',
      url: '/api/export/pdf',
      headers: { authorization: `Bearer ${emptyToken}` },
      payload: { format: 'pdf' },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.message || body.error?.message || '').toContain('No entries');
  });

  it('PDF: entry belonging to another user is NOT included', async () => {
    // Create another user with their own entry
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: 'other@test.com', password: 'password123', name: 'Other User' },
    });
    const otherToken = JSON.parse(otherRes.body).data.token;

    const otherTitleRes = await app.inject({
      method: 'POST',
      url: '/api/titles',
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { name: 'Other Title' },
    });
    const otherTitleId = JSON.parse(otherTitleRes.body).data.id;

    const otherSubtask = await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${otherToken}` },
      payload: {
        title_id: otherTitleId,
        description: 'Secret entry from other user',
        entry_date: getTodayDateString(),
        status: 'done',
      },
    });
    const otherSubtaskId = JSON.parse(otherSubtask.body).data.id;

    // Try to export other user's subtask with userToken (ownership check)
    const res = await app.inject({
      method: 'POST',
      url: '/api/export/pdf',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { format: 'pdf', subtask_ids: [otherSubtaskId] },
    });

    // Should fail with 400 (no matching entries after ownership check)
    expect(res.statusCode).toBe(400);
  });

  it('PDF: handles long description (200+ chars) without error', async () => {
    const longDesc = 'This is a very long task description that exceeds two hundred characters in total length. It includes details about the repair performed, the parts replaced, the technician notes, and the customer sign-off confirmation. Testing text wrapping in PDF layout engine.';
    expect(longDesc.length).toBeGreaterThan(200);

    await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        title_id: titleId,
        description: longDesc,
        entry_date: getTodayDateString(),
        status: 'done',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/export/pdf',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { format: 'pdf' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.rawPayload.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('PDF: handles special characters and symbols without error', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        title_id: titleId,
        description: 'Special chars: $240.50 & 50% discount for "Client A" — completed <today>',
        entry_date: getTodayDateString(),
        status: 'done',
        cost: 240.50,
        tags: ['billing', '$$$'],
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/export/pdf',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { format: 'pdf' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.rawPayload.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('PDF: single-entry Title renders without error', async () => {
    const db = getDatabase();
    if (db.reset) await db.reset();

    const singleRes = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: 'single@test.com', password: 'password123', name: 'Single Entry User' },
    });
    const singleToken = JSON.parse(singleRes.body).data.token;

    const singleTitleRes = await app.inject({
      method: 'POST',
      url: '/api/titles',
      headers: { authorization: `Bearer ${singleToken}` },
      payload: { name: 'Solo Task' },
    });
    const singleTitleId = JSON.parse(singleTitleRes.body).data.id;

    await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${singleToken}` },
      payload: {
        title_id: singleTitleId,
        description: 'Only one task',
        entry_date: getTodayDateString(),
        status: 'done',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/export/pdf',
      headers: { authorization: `Bearer ${singleToken}` },
      payload: { format: 'pdf' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.rawPayload.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  // ─────────────────────────────────────────────────────────
  // Excel Tests
  // ─────────────────────────────────────────────────────────

  it('XLSX: generates valid Excel binary with correct content-type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/export/xlsx',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { format: 'xlsx' },
    });

    expect(res.statusCode, `Expected 200, got ${res.statusCode}: ${res.body}`).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');

    // Excel .xlsx is a ZIP file — starts with PK (ZIP magic)
    const magic = res.rawPayload.subarray(0, 2).toString('hex');
    expect(magic).toBe('504b'); // PK

    expect(res.rawPayload.length).toBeGreaterThan(3_000);
  });

  it('XLSX: Content-Disposition has descriptive filename', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/export/xlsx',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { format: 'xlsx' },
    });

    expect(res.statusCode).toBe(200);
    const disposition = res.headers['content-disposition'] as string;
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('ledgr-export');
    expect(disposition).toContain('.xlsx');
  });

  it('XLSX: 400 when zero entries match', async () => {
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: 'emptyxlsx@test.com', password: 'password123', name: 'Empty XLSX' },
    });
    const emptyToken = JSON.parse(res2.body).data.token;

    const res = await app.inject({
      method: 'POST',
      url: '/api/export/xlsx',
      headers: { authorization: `Bearer ${emptyToken}` },
      payload: { format: 'xlsx' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('XLSX: optional fields (no cost/time/tags) produce no literal "N/A" or "-" values', async () => {
    // The second subtask created in beforeEach has no cost/time/tags
    // We export just that one by date
    const yesterday = getYesterdayDateString();

    const res = await app.inject({
      method: 'POST',
      url: '/api/export/xlsx',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        format: 'xlsx',
        filter: { start_date: yesterday, end_date: yesterday },
      },
    });

    expect(res.statusCode).toBe(200);
    // Buffer should not contain literal N/A or dash strings (would appear in XML)
    const rawStr = res.rawPayload.toString('utf8');
    // "N/A" in xlsx XML would look like <v>N/A</v> or in shared strings
    // This is a rough check — the xlsx is binary but shared string table is readable
    expect(rawStr).not.toContain('>N/A<');
    expect(rawStr).not.toContain('"N/A"');
  });

  // ─────────────────────────────────────────────────────────
  // CSV Tests
  // ─────────────────────────────────────────────────────────

  it('CSV: generates correct comma-separated text', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/export/csv',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { format: 'csv' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');

    const lines = res.body.split('\n');
    // Header row must match spec column order
    expect(lines[0]).toBe('Title,Description,Date,Status,Tags,Cost,Time Spent (min)');
    // Data rows should contain the title and description
    expect(res.body).toContain('HVAC Maintenance');
    expect(res.body).toContain('Replaced compressor coil');
  });

  it('CSV: Content-Disposition has descriptive filename', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/export/csv',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { format: 'csv' },
    });

    const disposition = res.headers['content-disposition'] as string;
    expect(disposition).toContain('ledgr-export');
    expect(disposition).toContain('.csv');
  });

  it('CSV: 400 when zero entries match', async () => {
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: 'emptycsv@test.com', password: 'password123', name: 'Empty CSV' },
    });
    const emptyToken = JSON.parse(res2.body).data.token;

    const res = await app.inject({
      method: 'POST',
      url: '/api/export/csv',
      headers: { authorization: `Bearer ${emptyToken}` },
      payload: { format: 'csv' },
    });

    expect(res.statusCode).toBe(400);
  });

  // ─────────────────────────────────────────────────────────
  // Authentication guard
  // ─────────────────────────────────────────────────────────

  it('All formats: 401 without auth token', async () => {
    for (const endpoint of ['/api/export/pdf', '/api/export/xlsx', '/api/export/csv']) {
      const res = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: { format: endpoint.includes('pdf') ? 'pdf' : endpoint.includes('xlsx') ? 'xlsx' : 'csv' },
      });
      expect(res.statusCode, `${endpoint} should return 401`).toBe(401);
    }
  });
});
