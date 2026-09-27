import { config } from '../config';
import { MemoryDatabase } from './memory-db';
import { SupabaseDatabase } from './supabase-db';
import { PostgresDatabase } from './postgres-db';
import type { IDatabase } from './types';

let dbInstance: IDatabase | null = null;

export function getDatabase(): IDatabase {
  if (!dbInstance) {
    if (config.usePostgres) {
      dbInstance = new PostgresDatabase(config.databaseUrl);
    } else if (config.useSupabase) {
      dbInstance = new SupabaseDatabase(config.supabaseUrl, config.supabaseKey);
    } else {
      dbInstance = new MemoryDatabase();
    }
  }
  return dbInstance;
}

export function setDatabase(customDb: IDatabase): void {
  dbInstance = customDb;
}

export * from './types';
export * from './memory-db';
export * from './supabase-db';
export * from './postgres-db';
