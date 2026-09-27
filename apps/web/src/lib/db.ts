import Dexie, { Table } from 'dexie';
import type { Title, Subtask, SyncMutation } from '@ledgr/shared';

export interface LocalOutboxItem extends SyncMutation {
  status: 'pending' | 'syncing' | 'failed';
  retry_count: number;
  error?: string;
}

export class LogPastDexie extends Dexie {
  titles!: Table<Title, string>;
  subtasks!: Table<Subtask, string>;
  outbox!: Table<LocalOutboxItem, string>;

  constructor() {
    super('LogPastDB');

    this.version(1).stores({
      titles: 'id, user_id, name, is_archived, sort_order, updated_at',
      subtasks: 'id, title_id, user_id, entry_date, status, updated_at, [title_id+entry_date]',
      outbox: 'id, mutation_id, timestamp, status'
    });
  }
}

export const localDb = new LogPastDexie();
