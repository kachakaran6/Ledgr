import { describe, it, expect, beforeEach } from 'vitest';
import { buildServer } from '../server';
import { getDatabase } from '../db';
import { getTodayDateString, getYesterdayDateString } from '@ledgr/shared';
import { addDays, format } from 'date-fns';

describe('Past-Only Date Rule Enforcement (FR-4 & Exit Criteria)', () => {
  const app = buildServer();
  let userToken: string;
  let titleId: string;

  beforeEach(async () => {
    const db = getDatabase();
    if (db.reset) await db.reset();

    // Register user
    const authRes = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: 'pastonly@test.com', password: 'password123' }
    });
    userToken = JSON.parse(authRes.body).data.token;

    // Create a title
    const titleRes = await app.inject({
      method: 'POST',
      url: '/api/titles',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'Garage Fleet A' }
    });
    titleId = JSON.parse(titleRes.body).data.id;
  });

  it('successfully creates subtasks for today and yesterday', async () => {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    const resToday = await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        title_id: titleId,
        description: 'Repaired brake pads — today',
        entry_date: today,
        status: 'done'
      }
    });
    expect(resToday.statusCode).toBe(201);
    expect(JSON.parse(resToday.body).data.entry_date).toBe(today);

    const resYesterday = await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        title_id: titleId,
        description: 'Repaired tyre — yesterday',
        entry_date: yesterday,
        status: 'done'
      }
    });
    expect(resYesterday.statusCode).toBe(201);
    expect(JSON.parse(resYesterday.body).data.entry_date).toBe(yesterday);
  });

  it('STRICTLY REJECTS future dates with 422 Unprocessable Entity at API layer', async () => {
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    const res = await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        title_id: titleId,
        description: 'Attempt to log tomorrow work',
        entry_date: tomorrowStr
      }
    });

    expect(res.statusCode).toBe(422);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(false);
    expect(json.error.message).toContain('Future dates are not allowed');
  });

  it('STRICTLY REJECTS far-future dates with 422 Unprocessable Entity', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        title_id: titleId,
        description: 'Year 2030 attempt',
        entry_date: '2030-01-01'
      }
    });

    expect(res.statusCode).toBe(422);
    const json = JSON.parse(res.body);
    expect(json.error.message).toContain('Future dates are not allowed');
  });

  it('rejects updating an existing subtask to a future date with 422', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        title_id: titleId,
        description: 'Initial past subtask',
        entry_date: getTodayDateString()
      }
    });
    const subtaskId = JSON.parse(createRes.body).data.id;

    const futureDate = format(addDays(new Date(), 2), 'yyyy-MM-dd');

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/subtasks/${subtaskId}`,
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        entry_date: futureDate
      }
    });

    expect(patchRes.statusCode).toBe(422);
  });
});
