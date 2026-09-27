import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../db';
import { isPastOrToday } from '@ledgr/shared';
import type { CreateSubtaskInput, UpdateSubtaskInput, FilterSubtasksInput, Subtask } from '@ledgr/shared';

export class SubtaskService {
  static async getSubtasks(userId: string, filter: FilterSubtasksInput) {
    const db = getDatabase();
    return db.getSubtasks(userId, filter);
  }

  static async getSubtaskById(userId: string, subtaskId: string): Promise<Subtask | null> {
    const db = getDatabase();
    return db.getSubtaskById(userId, subtaskId);
  }

  static async createSubtask(fastify: FastifyInstance, userId: string, input: CreateSubtaskInput): Promise<Subtask> {
    // API-Level Strict Past-Date Enforcement (FR-4)
    if (!isPastOrToday(input.entry_date)) {
      throw fastify.httpErrors.unprocessableEntity('Future dates are not allowed. You can only log work for today or past dates.');
    }

    const db = getDatabase();
    try {
      const subtask = await db.createSubtask(userId, input);
      await db.createAuditLog(userId, 'CREATE_SUBTASK', 'subtask', subtask.id, {
        title_id: subtask.title_id,
        entry_date: subtask.entry_date,
        description: subtask.description
      });
      return subtask;
    } catch (err: any) {
      if (err.message?.includes('Title not found')) {
        throw fastify.httpErrors.notFound('Target title not found or unauthorized');
      }
      if (err.message?.includes('CHECK CONSTRAINT VIOLATION') || err.message?.includes('future dates')) {
        throw fastify.httpErrors.unprocessableEntity(err.message);
      }
      throw err;
    }
  }

  static async updateSubtask(fastify: FastifyInstance, userId: string, subtaskId: string, input: UpdateSubtaskInput): Promise<Subtask | null> {
    if (input.entry_date && !isPastOrToday(input.entry_date)) {
      throw fastify.httpErrors.unprocessableEntity('Future dates are not allowed. You can only log work for today or past dates.');
    }

    const db = getDatabase();
    try {
      const updated = await db.updateSubtask(userId, subtaskId, input);
      if (updated) {
        await db.createAuditLog(userId, 'UPDATE_SUBTASK', 'subtask', subtaskId, { changes: input });
      }
      return updated;
    } catch (err: any) {
      if (err.message?.includes('Title not found')) {
        throw fastify.httpErrors.notFound('Target title not found or unauthorized');
      }
      if (err.message?.includes('CHECK CONSTRAINT VIOLATION') || err.message?.includes('future dates')) {
        throw fastify.httpErrors.unprocessableEntity(err.message);
      }
      throw err;
    }
  }

  static async deleteSubtask(userId: string, subtaskId: string): Promise<boolean> {
    const db = getDatabase();
    const success = await db.deleteSubtask(userId, subtaskId);
    if (success) {
      await db.createAuditLog(userId, 'DELETE_SUBTASK', 'subtask', subtaskId, {});
    }
    return success;
  }

  static async bulkDeleteSubtasks(userId: string, ids: string[]): Promise<number> {
    const db = getDatabase();
    const count = await db.bulkDeleteSubtasks(userId, ids);
    if (count > 0) {
      await db.createAuditLog(userId, 'BULK_DELETE_SUBTASKS', 'subtask', null, { count, ids });
    }
    return count;
  }

  static async reorderSubtasks(userId: string, titleId: string, orderedIds: string[]): Promise<boolean> {
    const db = getDatabase();
    return db.reorderSubtasks(userId, titleId, orderedIds);
  }
}
