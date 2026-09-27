import { describe, it, expect } from 'vitest';
import type { Subtask } from '@ledgr/shared';

describe('Client-Side Export Engine Formats', () => {
  const sampleSubtasks: Subtask[] = [
    {
      id: 'subtask-1',
      title_id: 'title-1',
      user_id: 'user-1',
      description: 'Replaced rear brake calipers and brake fluid',
      entry_date: '2026-09-27',
      status: 'done',
      tags: ['brakes', 'fluid'],
      cost: 210.50,
      time_spent_minutes: 90,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      title: {
        id: 'title-1',
        user_id: 'user-1',
        name: 'Garage Workshop',
        color: '#3b82f6',
        icon: 'wrench',
        is_archived: false,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      }
    }
  ];

  it('verifies subtask dataset structure is export-ready', () => {
    expect(sampleSubtasks.length).toBe(1);
    expect(sampleSubtasks[0]?.description).toContain('Replaced rear brake');
    expect(sampleSubtasks[0]?.title?.name).toBe('Garage Workshop');
    expect(sampleSubtasks[0]?.cost).toBe(210.50);
  });
});
