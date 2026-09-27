import { getDatabase } from '../db';
import { isPastOrToday } from '@ledgr/shared';
import type { SyncBatchInput, SyncResponse } from '@ledgr/shared';

export class SyncService {
  static async processBatch(userId: string, input: SyncBatchInput): Promise<SyncResponse> {
    const db = getDatabase();
    let appliedCount = 0;
    const conflicts: SyncResponse['conflicts'] = [];

    for (const mutation of input.mutations) {
      try {
        switch (mutation.type) {
          case 'CREATE_TITLE': {
            await db.createTitle(userId, mutation.payload as any);
            appliedCount++;
            break;
          }
          case 'UPDATE_TITLE': {
            const existing = await db.getTitleById(userId, mutation.entity_id);
            if (!existing) {
              conflicts.push({
                mutationId: mutation.mutation_id,
                serverRecord: null,
                reason: 'Title not found on server'
              });
            } else {
              await db.updateTitle(userId, mutation.entity_id, mutation.payload as any);
              appliedCount++;
            }
            break;
          }
          case 'DELETE_TITLE': {
            await db.deleteTitle(userId, mutation.entity_id);
            appliedCount++;
            break;
          }
          case 'CREATE_SUBTASK': {
            if (mutation.payload.entry_date && !isPastOrToday(mutation.payload.entry_date)) {
              conflicts.push({
                mutationId: mutation.mutation_id,
                serverRecord: null,
                reason: 'Future date rejected by server constraint'
              });
              break;
            }
            await db.createSubtask(userId, mutation.payload as any);
            appliedCount++;
            break;
          }
          case 'UPDATE_SUBTASK': {
            const existing = await db.getSubtaskById(userId, mutation.entity_id);
            if (!existing) {
              conflicts.push({
                mutationId: mutation.mutation_id,
                serverRecord: null,
                reason: 'Subtask not found on server'
              });
            } else {
              if (mutation.payload.entry_date && !isPastOrToday(mutation.payload.entry_date)) {
                conflicts.push({
                  mutationId: mutation.mutation_id,
                  serverRecord: existing,
                  reason: 'Future date rejected by server constraint'
                });
                break;
              }
              await db.updateSubtask(userId, mutation.entity_id, mutation.payload as any);
              appliedCount++;
            }
            break;
          }
          case 'DELETE_SUBTASK': {
            await db.deleteSubtask(userId, mutation.entity_id);
            appliedCount++;
            break;
          }
        }
      } catch (err: any) {
        conflicts.push({
          mutationId: mutation.mutation_id,
          serverRecord: null,
          reason: err.message || 'Error executing mutation'
        });
      }
    }

    // Retrieve full latest dataset for user
    const titles = await db.getTitles(userId, true);
    const { items: subtasks } = await db.getSubtasks(userId, {
      page: 1,
      limit: 5000,
      sort_by: 'entry_date',
      sort_dir: 'desc'
    });

    await db.createAuditLog(userId, 'SYNC_BATCH', 'sync', null, {
      mutationCount: input.mutations.length,
      appliedCount,
      conflictCount: conflicts.length
    });

    return {
      appliedCount,
      conflicts,
      serverChanges: {
        titles,
        subtasks,
        syncedAt: new Date().toISOString()
      }
    };
  }
}
