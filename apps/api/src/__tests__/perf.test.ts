import { describe, it, expect } from 'vitest';
import { buildServer } from '../server';
import { getDatabase } from '../db';

describe('Performance & Latency Targets (p99 < 500ms for 5,000+ records)', () => {
  const app = buildServer();
  let userToken: string;
  let titleId: string;

  it('seeds 5,000 records and executes sub-150ms search & filter queries', async () => {
    const db = getDatabase();
    if (db.reset) await db.reset();

    // 1. Setup User & Title
    const authRes = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: 'perf@benchmark.com', password: 'password123', name: 'Perf Tester' }
    });
    const userId = JSON.parse(authRes.body).data.user.id;
    userToken = JSON.parse(authRes.body).data.token;

    const title = await db.createTitle(userId, { name: 'Garage Benchmark', color: '#3b82f6', icon: 'folder', sort_order: 0 });
    titleId = title.id;

    // 2. Fast batch seeding 5,000 records directly into DB
    const baseDate = new Date('2026-09-27T00:00:00.000Z');
    for (let i = 0; i < 5000; i++) {
      const pastDayOffset = (i % 60); // past 60 days
      const d = new Date(baseDate);
      d.setDate(d.getDate() - pastDayOffset);
      const dateStr = d.toISOString().split('T')[0]!;

      const tag = i % 5 === 0 ? 'tyre' : i % 3 === 0 ? 'brake' : 'oil';
      const desc = `Service task #${i}: Replaced ${tag} and inspected safety components`;

      await db.createSubtask(userId, {
        title_id: titleId,
        description: desc,
        entry_date: dateStr,
        status: 'done',
        cost: 50 + (i % 200),
        time_spent_minutes: 30 + (i % 60),
        tags: [tag, 'maintenance'],
        sort_order: i
      });
    }

    // 3. Measure filtered search latency (multi-criteria: title + date range + text)
    const start = performance.now();
    const res = await app.inject({
      method: 'GET',
      url: `/api/subtasks?title_ids=${titleId}&date_preset=last_7_days&search=tyre&limit=100`,
      headers: { authorization: `Bearer ${userToken}` }
    });
    const duration = performance.now() - start;

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);

    // Target: < 150ms client/API response time
    expect(duration).toBeLessThan(150);
  });
});
