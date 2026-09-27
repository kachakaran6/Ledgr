import { v4 as uuidv4 } from 'uuid';
import { isPastOrToday, getDateRangeFromPreset } from '@ledgr/shared';
import type {
  Title,
  Subtask,
  AuditLog,
  CreateTitleInput,
  UpdateTitleInput,
  CreateSubtaskInput,
  UpdateSubtaskInput,
  FilterSubtasksInput
} from '@ledgr/shared';
import type { IDatabase, DbUser } from './types';

export class MemoryDatabase implements IDatabase {
  private users = new Map<string, DbUser>();
  private titles = new Map<string, Title>();
  private subtasks = new Map<string, Subtask>();
  private auditLogs: AuditLog[] = [];

  constructor() {
    this.seedDemoUser();
  }

  private seedDemoUser() {
    const demoId = '00000000-0000-0000-0000-000000000001';
    // Password is 'password123'
    const demoUser: DbUser = {
      id: demoId,
      email: 'demo@logpast.app',
      password_hash: '$2a$10$7EqJtq98hPqEX7fNZaFWoOdi.K.b8o9mSwh5B6jU8H3Xyv6nCqLKi',
      name: 'Demo Technician',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.users.set(demoId, demoUser);
  }

  async reset(): Promise<void> {
    this.users.clear();
    this.titles.clear();
    this.subtasks.clear();
    this.auditLogs = [];
    this.seedDemoUser();
  }

  // USERS
  async createUser(email: string, passwordHash: string, name?: string): Promise<DbUser> {
    const existing = await this.getUserByEmail(email);
    if (existing) {
      throw new Error('User with this email already exists');
    }
    const now = new Date().toISOString();
    const user: DbUser = {
      id: uuidv4(),
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name: name?.trim(),
      created_at: now,
      updated_at: now
    };
    this.users.set(user.id, user);
    return user;
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    const norm = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === norm) return u;
    }
    return null;
  }

  async getUserById(id: string): Promise<DbUser | null> {
    return this.users.get(id) || null;
  }

  async deleteUser(userId: string): Promise<boolean> {
    if (!this.users.has(userId)) return false;
    this.users.delete(userId);
    // Cascade delete titles & subtasks
    for (const [tId, t] of this.titles.entries()) {
      if (t.user_id === userId) this.titles.delete(tId);
    }
    for (const [sId, s] of this.subtasks.entries()) {
      if (s.user_id === userId) this.subtasks.delete(sId);
    }
    this.auditLogs = this.auditLogs.filter((a) => a.user_id !== userId);
    return true;
  }

  // TITLES (RLS: scoped to userId)
  async getTitles(userId: string, includeArchived = false): Promise<Title[]> {
    const userTitles: Title[] = [];
    for (const t of this.titles.values()) {
      if (t.user_id === userId && !t.deleted_at) {
        if (!includeArchived && t.is_archived) continue;

        // Compute subtask count and last logged date
        let count = 0;
        let lastDate: string | null = null;
        for (const s of this.subtasks.values()) {
          if (s.user_id === userId && s.title_id === t.id && !s.deleted_at) {
            count++;
            if (!lastDate || s.entry_date > lastDate) {
              lastDate = s.entry_date;
            }
          }
        }

        userTitles.push({
          ...t,
          subtask_count: count,
          last_logged_date: lastDate
        });
      }
    }
    return userTitles.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }

  async getTitleById(userId: string, titleId: string): Promise<Title | null> {
    const t = this.titles.get(titleId);
    // RLS Enforcement
    if (!t || t.user_id !== userId || t.deleted_at) return null;
    return t;
  }

  async createTitle(userId: string, input: CreateTitleInput): Promise<Title> {
    const now = new Date().toISOString();
    const title: Title = {
      id: uuidv4(),
      user_id: userId,
      name: input.name,
      color: input.color || '#3b82f6',
      icon: input.icon || 'folder',
      is_archived: false,
      sort_order: input.sort_order ?? 0,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };
    this.titles.set(title.id, title);
    return title;
  }

  async updateTitle(userId: string, titleId: string, input: UpdateTitleInput): Promise<Title | null> {
    const t = await this.getTitleById(userId, titleId);
    if (!t) return null;

    const updated: Title = {
      ...t,
      ...input,
      updated_at: new Date().toISOString()
    };
    this.titles.set(titleId, updated);
    return updated;
  }

  async deleteTitle(userId: string, titleId: string): Promise<boolean> {
    const t = await this.getTitleById(userId, titleId);
    if (!t) return false;

    // Soft delete
    t.deleted_at = new Date().toISOString();
    this.titles.set(titleId, t);

    // Soft delete associated subtasks
    for (const [sId, s] of this.subtasks.entries()) {
      if (s.title_id === titleId && s.user_id === userId) {
        s.deleted_at = t.deleted_at;
        this.subtasks.set(sId, s);
      }
    }
    return true;
  }

  // SUBTASKS (RLS: scoped to userId + past-only constraint)
  async getSubtasks(userId: string, filter: FilterSubtasksInput): Promise<{ items: Subtask[]; total: number }> {
    let result: Subtask[] = [];

    // Resolve date range presets
    let { startDate, endDate } = filter.date_preset ? getDateRangeFromPreset(filter.date_preset) : { startDate: filter.start_date, endDate: filter.end_date };
    if (!startDate && filter.start_date) startDate = filter.start_date;
    if (!endDate && filter.end_date) endDate = filter.end_date;

    const searchLower = filter.search?.toLowerCase().trim();
    const titleIdsSet = filter.title_ids && filter.title_ids.length > 0 ? new Set(filter.title_ids) : null;

    for (const s of this.subtasks.values()) {
      // RLS Enforcement: strictly user_id
      if (s.user_id !== userId || s.deleted_at) continue;

      // Filter by Title
      if (titleIdsSet && !titleIdsSet.has(s.title_id)) continue;

      // Filter by Status
      if (filter.status && s.status !== filter.status) continue;

      // Filter by Date Range
      if (startDate && s.entry_date < startDate) continue;
      if (endDate && s.entry_date > endDate) continue;

      // Search full-text (description + title name)
      if (searchLower) {
        const title = this.titles.get(s.title_id);
        const titleName = title?.name.toLowerCase() || '';
        const descMatch = s.description.toLowerCase().includes(searchLower);
        const tagMatch = s.tags.some((t) => t.toLowerCase().includes(searchLower));
        const titleMatch = titleName.includes(searchLower);

        if (!descMatch && !tagMatch && !titleMatch) continue;
      }

      // Attach title summary
      const parentTitle = this.titles.get(s.title_id);
      result.push({
        ...s,
        title: parentTitle
      });
    }

    // Sort
    const dir = filter.sort_dir === 'asc' ? 1 : -1;
    if (filter.sort_by === 'entry_date') {
      result.sort((a, b) => (a.entry_date > b.entry_date ? dir : a.entry_date < b.entry_date ? -dir : b.created_at.localeCompare(a.created_at)));
    } else if (filter.sort_by === 'created_at') {
      result.sort((a, b) => (a.created_at > b.created_at ? dir : -dir));
    } else if (filter.sort_by === 'sort_order') {
      result.sort((a, b) => (a.sort_order - b.sort_order) * dir);
    }

    const total = result.length;
    const page = filter.page || 1;
    const limit = filter.limit || 100;
    const startIndex = (page - 1) * limit;
    const items = result.slice(startIndex, startIndex + limit);

    return { items, total };
  }

  async getSubtaskById(userId: string, subtaskId: string): Promise<Subtask | null> {
    const s = this.subtasks.get(subtaskId);
    if (!s || s.user_id !== userId || s.deleted_at) return null;
    const title = this.titles.get(s.title_id);
    return { ...s, title };
  }

  async createSubtask(userId: string, input: CreateSubtaskInput): Promise<Subtask> {
    // 1. Verify parent title exists and belongs to user (RLS)
    const title = await this.getTitleById(userId, input.title_id);
    if (!title) {
      throw new Error('Title not found or does not belong to user');
    }

    // 2. Strict Past-Only Rule validation (DB constraint check)
    if (!isPastOrToday(input.entry_date)) {
      throw new Error('CHECK CONSTRAINT VIOLATION: entry_date must be <= CURRENT_DATE (future dates rejected)');
    }

    const now = new Date().toISOString();
    const subtask: Subtask = {
      id: uuidv4(),
      title_id: input.title_id,
      user_id: userId,
      description: input.description,
      entry_date: input.entry_date,
      status: input.status || 'done',
      tags: input.tags || [],
      cost: input.cost ?? null,
      time_spent_minutes: input.time_spent_minutes ?? null,
      sort_order: input.sort_order ?? 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      title
    };

    this.subtasks.set(subtask.id, subtask);
    return subtask;
  }

  async updateSubtask(userId: string, subtaskId: string, input: UpdateSubtaskInput): Promise<Subtask | null> {
    const s = await this.getSubtaskById(userId, subtaskId);
    if (!s) return null;

    if (input.entry_date && !isPastOrToday(input.entry_date)) {
      throw new Error('CHECK CONSTRAINT VIOLATION: entry_date must be <= CURRENT_DATE (future dates rejected)');
    }

    if (input.title_id && input.title_id !== s.title_id) {
      const newTitle = await this.getTitleById(userId, input.title_id);
      if (!newTitle) {
        throw new Error('Target Title not found or does not belong to user');
      }
    }

    const updated: Subtask = {
      ...s,
      ...input,
      updated_at: new Date().toISOString()
    };
    this.subtasks.set(subtaskId, updated);
    return updated;
  }

  async deleteSubtask(userId: string, subtaskId: string): Promise<boolean> {
    const s = await this.getSubtaskById(userId, subtaskId);
    if (!s) return false;

    s.deleted_at = new Date().toISOString();
    this.subtasks.set(subtaskId, s);
    return true;
  }

  async bulkDeleteSubtasks(userId: string, ids: string[]): Promise<number> {
    let deletedCount = 0;
    const now = new Date().toISOString();
    for (const id of ids) {
      const s = this.subtasks.get(id);
      if (s && s.user_id === userId && !s.deleted_at) {
        s.deleted_at = now;
        this.subtasks.set(id, s);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  async reorderSubtasks(userId: string, titleId: string, orderedIds: string[]): Promise<boolean> {
    const title = await this.getTitleById(userId, titleId);
    if (!title) return false;

    orderedIds.forEach((id, index) => {
      const s = this.subtasks.get(id);
      if (s && s.user_id === userId && s.title_id === titleId) {
        s.sort_order = index;
        s.updated_at = new Date().toISOString();
        this.subtasks.set(id, s);
      }
    });
    return true;
  }

  // AUDIT LOGS
  async createAuditLog(userId: string, action: string, entityType: string, entityId: string | null, details: Record<string, any>): Promise<AuditLog> {
    const log: AuditLog = {
      id: uuidv4(),
      user_id: userId,
      action: action as any,
      entity_type: entityType,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString()
    };
    this.auditLogs.unshift(log);
    return log;
  }

  async getAuditLogs(userId: string, limit = 50): Promise<AuditLog[]> {
    return this.auditLogs.filter((l) => l.user_id === userId).slice(0, limit);
  }

  // GDPR EXPORT
  async exportAllUserData(userId: string) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');
    const titles = await this.getTitles(userId, true);
    const { items: subtasks } = await this.getSubtasks(userId, {
      page: 1,
      limit: 10000,
      sort_by: 'entry_date',
      sort_dir: 'desc'
    });
    const auditLogs = await this.getAuditLogs(userId, 500);

    return { user, titles, subtasks, auditLogs };
  }
}
