import { describe, it, expect, beforeEach } from 'vitest';
import { buildServer } from '../server';
import { getDatabase } from '../db';
import { getTodayDateString, getYesterdayDateString } from '@ledgr/shared';

describe('Export Engine (PDF, XLSX, CSV)', () => {
  const app = buildServer();
  let userToken: string;

  beforeEach(async () => {
    const db = getDatabase();
    if (db.reset) await db.reset();

    // Register user
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: 'exportuser@example.com', password: 'password123', name: 'Field Tech Alex' }
    });
    userToken = JSON.parse(res.body).data.token;

    // Create Title
    const titleRes = await app.inject({
      method: 'POST',
      url: '/api/titles',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'HVAC Maintenance' }
    });
    const titleId = JSON.parse(titleRes.body).data.id;

    // Create subtasks
    await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        title_id: titleId,
        description: 'Replaced compressor coil and capacitor',
        entry_date: getTodayDateString(),
        status: 'done',
        cost: 240,
        time_spent_minutes: 120,
        tags: ['compressor', 'cooling']
      }
    });

    await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        title_id: titleId,
        description: 'Cleaned air handler filters and flushed drain',
        entry_date: getYesterdayDateString(),
        status: 'done',
        cost: 80,
        time_spent_minutes: 45,
        tags: ['filters']
      }
    });
  });

  it('generates a valid PDF document with headers', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/export/pdf',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { format: 'pdf', include_meta: true }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.rawPayload.length).toBeGreaterThan(500);
    // Verify PDF header magic bytes %PDF
    const headerStr = res.rawPayload.subarray(0, 4).toString('ascii');
    expect(headerStr).toBe('%PDF');
  });

  it('generates a valid XLSX document', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/export/xlsx',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { format: 'xlsx', include_meta: true }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });

  it('generates a clean CSV document', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/export/csv',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { format: 'csv' }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.body).toContain('Title,Date,Description,Status');
    expect(res.body).toContain('Replaced compressor coil and capacitor');
    expect(res.body).toContain('HVAC Maintenance');
  });
});
