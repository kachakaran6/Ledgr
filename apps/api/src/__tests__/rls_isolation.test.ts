import { describe, it, expect, beforeEach } from 'vitest';
import { buildServer } from '../server';
import { getDatabase } from '../db';
import { getTodayDateString } from '@ledgr/shared';

describe('Row-Level Security & Cross-User Data Isolation', () => {
  const app = buildServer();
  let userAToken: string;
  let userBToken: string;
  let userATitleId: string;
  let userASubtaskId: string;

  beforeEach(async () => {
    const db = getDatabase();
    if (db.reset) await db.reset();

    // Register User A
    const resA = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: 'usera@example.com', password: 'password123' }
    });
    userAToken = JSON.parse(resA.body).data.token;

    // Register User B
    const resB = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: 'userb@example.com', password: 'password123' }
    });
    userBToken = JSON.parse(resB.body).data.token;

    // User A creates a Title
    const titleA = await app.inject({
      method: 'POST',
      url: '/api/titles',
      headers: { authorization: `Bearer ${userAToken}` },
      payload: { name: "User A Confidential Client" }
    });
    userATitleId = JSON.parse(titleA.body).data.id;

    // User A creates a Subtask
    const subtaskA = await app.inject({
      method: 'POST',
      url: '/api/subtasks',
      headers: { authorization: `Bearer ${userAToken}` },
      payload: {
        title_id: userATitleId,
        description: 'Audit internal accounts for client',
        entry_date: getTodayDateString()
      }
    });
    userASubtaskId = JSON.parse(subtaskA.body).data.id;
  });

  it('User B cannot see User A titles in list query', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/titles',
      headers: { authorization: `Bearer ${userBToken}` }
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.data.length).toBe(0);
  });

  it('User B cannot get User A title by ID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/titles/${userATitleId}`,
      headers: { authorization: `Bearer ${userBToken}` }
    });

    expect(res.statusCode).toBe(404);
  });

  it('User B cannot see User A subtasks in list or search query', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/subtasks?search=Audit',
      headers: { authorization: `Bearer ${userBToken}` }
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.data.length).toBe(0);
    expect(json.meta.total).toBe(0);
  });

  it('User B cannot get User A subtask by ID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/subtasks/${userASubtaskId}`,
      headers: { authorization: `Bearer ${userBToken}` }
    });

    expect(res.statusCode).toBe(404);
  });

  it('User B cannot update User A subtask', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/subtasks/${userASubtaskId}`,
      headers: { authorization: `Bearer ${userBToken}` },
      payload: { description: 'Malicious overwrite attempt' }
    });

    expect(res.statusCode).toBe(404);
  });

  it('User B cannot delete User A subtask', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/subtasks/${userASubtaskId}`,
      headers: { authorization: `Bearer ${userBToken}` }
    });

    expect(res.statusCode).toBe(404);
  });
});
