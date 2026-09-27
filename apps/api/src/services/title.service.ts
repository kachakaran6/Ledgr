import { getDatabase } from '../db';
import type { CreateTitleInput, UpdateTitleInput, Title } from '@ledgr/shared';

export class TitleService {
  static async getTitles(userId: string, includeArchived = false): Promise<Title[]> {
    const db = getDatabase();
    return db.getTitles(userId, includeArchived);
  }

  static async getTitleById(userId: string, titleId: string): Promise<Title | null> {
    const db = getDatabase();
    return db.getTitleById(userId, titleId);
  }

  static async createTitle(userId: string, input: CreateTitleInput): Promise<Title> {
    const db = getDatabase();
    const title = await db.createTitle(userId, input);
    await db.createAuditLog(userId, 'CREATE_TITLE', 'title', title.id, { name: title.name });
    return title;
  }

  static async updateTitle(userId: string, titleId: string, input: UpdateTitleInput): Promise<Title | null> {
    const db = getDatabase();
    const updated = await db.updateTitle(userId, titleId, input);
    if (updated) {
      await db.createAuditLog(userId, input.is_archived !== undefined ? 'ARCHIVE_TITLE' : 'UPDATE_TITLE', 'title', titleId, { changes: input });
    }
    return updated;
  }

  static async deleteTitle(userId: string, titleId: string): Promise<boolean> {
    const db = getDatabase();
    const success = await db.deleteTitle(userId, titleId);
    if (success) {
      await db.createAuditLog(userId, 'DELETE_TITLE', 'title', titleId, {});
    }
    return success;
  }
}
