import { describe, it, expect, beforeEach } from 'vitest';
import { buildServer } from '../server';
import { getDatabase } from '../db';

describe('Auth Endpoints & Security', () => {
  const app = buildServer();

  beforeEach(async () => {
    const db = getDatabase();
    if (db.reset) await db.reset();
  });

  it('signs up a new user and returns JWT session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        email: 'mechanic@garage.com',
        password: 'securepassword123',
        name: 'John Mechanic'
      }
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe('mechanic@garage.com');
    expect(json.data.token).toBeDefined();
  });

  it('rejects duplicate email registrations with conflict error', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        email: 'dup@test.com',
        password: 'password123'
      }
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        email: 'dup@test.com',
        password: 'password123'
      }
    });

    expect(res.statusCode).toBe(409);
    const json = JSON.parse(res.body);
    expect(json.error.code).toBe('CONFLICT');
  });

  it('logs in with valid credentials', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        email: 'login@test.com',
        password: 'password123'
      }
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'login@test.com',
        password: 'password123'
      }
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.data.token).toBeDefined();
  });

  it('rejects login with incorrect password', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        email: 'wrongpass@test.com',
        password: 'password123'
      }
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'wrongpass@test.com',
        password: 'incorrectPassword'
      }
    });

    expect(res.statusCode).toBe(401);
  });
});
