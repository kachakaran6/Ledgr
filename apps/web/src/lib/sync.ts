import { useEffect, useState } from 'react';
import { localDb, type LocalOutboxItem } from './db';
import { api } from './api';
import type { SyncMutation } from '@ledgr/shared';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

class SyncEngine {
  private state: SyncState = navigator.onLine ? 'synced' : 'offline';
  private listeners: Set<(state: SyncState, pendingCount: number) => void> = new Set();
  private isProcessing = false;

  constructor() {
    window.addEventListener('online', () => {
      this.state = 'synced';
      this.notify();
      this.flushOutbox();
    });

    window.addEventListener('offline', () => {
      this.state = 'offline';
      this.notify();
    });

    // Background sync cycle every 15 seconds when online and authenticated
    setInterval(() => {
      if (navigator.onLine && !this.isProcessing && api.getToken()) {
        this.flushOutbox();
      }
    }, 15000);
  }

  subscribe(listener: (state: SyncState, pendingCount: number) => void) {
    this.listeners.add(listener);
    this.getPendingCount().then((count) => listener(this.state, count));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notify() {
    const count = await this.getPendingCount();
    this.listeners.forEach((l) => l(this.state, count));
  }

  async getPendingCount(): Promise<number> {
    try {
      return await localDb.outbox.where('status').equals('pending').count();
    } catch {
      return 0;
    }
  }

  // Queue a mutation for offline-first instant local response
  async queueMutation(type: SyncMutation['type'], entityId: string, payload: Record<string, any>) {
    const mutation: LocalOutboxItem = {
      id: crypto.randomUUID(),
      mutation_id: crypto.randomUUID(),
      type,
      entity_id: entityId,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retry_count: 0
    };

    await localDb.outbox.add(mutation);
    await this.notify();

    if (navigator.onLine && api.getToken()) {
      this.flushOutbox();
    }
  }

  async flushOutbox() {
    if (this.isProcessing || !navigator.onLine || !api.getToken()) return;
    this.isProcessing = true;
    this.state = 'syncing';
    this.notify();

    try {
      const pending = await localDb.outbox.where('status').equals('pending').toArray();
      if (pending.length === 0) {
        this.state = 'synced';
        this.notify();
        this.isProcessing = false;
        return;
      }

      const syncResult = await api.syncBatch({
        mutations: pending.map((m) => ({
          id: m.id,
          mutation_id: m.mutation_id,
          type: m.type,
          entity_id: m.entity_id,
          payload: m.payload,
          timestamp: m.timestamp
        }))
      });

      // Clear applied items from local outbox
      const idsToDelete = pending.map((m) => m.id);
      await localDb.outbox.bulkDelete(idsToDelete);

      // Reconcile server changes into Dexie
      if (syncResult.serverChanges) {
        await localDb.transaction('rw', [localDb.titles, localDb.subtasks], async () => {
          if (syncResult.serverChanges.titles.length > 0) {
            await localDb.titles.bulkPut(syncResult.serverChanges.titles);
          }
          if (syncResult.serverChanges.subtasks.length > 0) {
            await localDb.subtasks.bulkPut(syncResult.serverChanges.subtasks);
          }
        });
      }

      this.state = 'synced';
    } catch {
      this.state = navigator.onLine ? 'error' : 'offline';
    } finally {
      this.isProcessing = false;
      this.notify();
    }
  }
}

export const syncEngine = new SyncEngine();

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncState>(navigator.onLine ? 'synced' : 'offline');
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus, count) => {
      setStatus(newStatus);
      setPendingCount(count);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return { status, pendingCount, flush: () => syncEngine.flushOutbox() };
}
