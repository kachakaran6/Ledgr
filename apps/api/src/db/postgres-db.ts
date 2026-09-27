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

export class PostgresDatabase implements IDatabase {
  private connectionString: string;
  private pool: any = null;
  private initialized = false;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  private async getPool(): Promise<any> {
    if (!this.pool) {
      const pgModule: any = await import('pg');
      const PoolClass = pgModule.default?.Pool || pgModule.Pool;
      this.pool = new PoolClass({
        connectionString: this.connectionString,
        ssl: this.connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
      });
    }
    return this.pool;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS titles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          color VARCHAR(32) DEFAULT '#3b82f6',
          icon VARCHAR(64) DEFAULT 'folder',
          is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          deleted_at TIMESTAMPTZ NULL
        );

        CREATE TABLE IF NOT EXISTS subtasks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title_id UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          entry_date DATE NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'done',
          tags TEXT[] NOT NULL DEFAULT '{}',
          cost NUMERIC(12, 2) NULL,
          time_spent_minutes INTEGER NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          deleted_at TIMESTAMPTZ NULL,
          CONSTRAINT check_past_or_today_date CHECK (entry_date <= CURRENT_DATE)
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          action VARCHAR(64) NOT NULL,
          entity_type VARCHAR(64) NOT NULL,
          entity_id VARCHAR(128) NULL,
          details JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_titles_user ON titles(user_id) WHERE deleted_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_subtasks_user ON subtasks(user_id) WHERE deleted_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_subtasks_title ON subtasks(title_id) WHERE deleted_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
      `);
      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize Postgres schema:', err);
    } finally {
      client.release();
    }
  }

  // USERS
  async createUser(email: string, passwordHash: string, name?: string): Promise<DbUser> {
    await this.init();
    const pool = await this.getPool();
    const normalizedEmail = email.toLowerCase().trim();
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, email, password_hash, name, created_at, updated_at`,
      [uuidv4(), normalizedEmail, passwordHash, name?.trim() || null]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      name: row.name || undefined,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString()
    };
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    await this.init();
    const pool = await this.getPool();
    const normalizedEmail = email.toLowerCase().trim();
    const result = await pool.query(
      `SELECT id, email, password_hash, name, created_at, updated_at
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [normalizedEmail]
    );
    if (!result.rows.length) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      name: row.name || undefined,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString()
    };
  }

  async getUserById(id: string): Promise<DbUser | null> {
    await this.init();
    const pool = await this.getPool();
    const result = await pool.query(
      `SELECT id, email, password_hash, name, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    if (!result.rows.length) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      name: row.name || undefined,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString()
    };
  }

  async deleteUser(userId: string): Promise<boolean> {
    await this.init();
    const pool = await this.getPool();
    const result = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return (result.rowCount ?? 0) > 0;
  }

  // TITLES
  async getTitles(userId: string, includeArchived = false): Promise<Title[]> {
    await this.init();
    const pool = await this.getPool();
    const query = `
      SELECT t.*, 
        (SELECT COUNT(*)::int FROM subtasks s WHERE s.title_id = t.id AND s.deleted_at IS NULL) as subtask_count,
        (SELECT MAX(entry_date)::text FROM subtasks s WHERE s.title_id = t.id AND s.deleted_at IS NULL) as last_logged_date
      FROM titles t
      WHERE t.user_id = $1 AND t.deleted_at IS NULL
      ${includeArchived ? '' : 'AND t.is_archived = FALSE'}
      ORDER BY t.sort_order ASC, t.created_at DESC
    `;
    const res = await pool.query(query, [userId]);
    return res.rows.map((row: any): Title => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      is_archived: row.is_archived,
      sort_order: row.sort_order,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
      subtask_count: row.subtask_count || 0,
      last_logged_date: row.last_logged_date ? String(row.last_logged_date).split('T')[0] : null
    }));
  }

  async getTitleById(userId: string, titleId: string): Promise<Title | null> {
    await this.init();
    const pool = await this.getPool();
    const query = `
      SELECT t.*, 
        (SELECT COUNT(*)::int FROM subtasks s WHERE s.title_id = t.id AND s.deleted_at IS NULL) as subtask_count,
        (SELECT MAX(entry_date)::text FROM subtasks s WHERE s.title_id = t.id AND s.deleted_at IS NULL) as last_logged_date
      FROM titles t
      WHERE t.id = $1 AND t.user_id = $2 AND t.deleted_at IS NULL
    `;
    const res = await pool.query(query, [titleId, userId]);
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      is_archived: row.is_archived,
      sort_order: row.sort_order,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
      subtask_count: row.subtask_count || 0,
      last_logged_date: row.last_logged_date ? String(row.last_logged_date).split('T')[0] : null
    };
  }

  async createTitle(userId: string, input: CreateTitleInput): Promise<Title> {
    await this.init();
    const pool = await this.getPool();
    const id = uuidv4();
    const res = await pool.query(
      `INSERT INTO titles (id, user_id, name, color, icon, is_archived, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, $6, NOW(), NOW())
       RETURNING *`,
      [id, userId, input.name.trim(), input.color || '#3b82f6', input.icon || 'folder', input.sort_order || 0]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      is_archived: row.is_archived,
      sort_order: row.sort_order,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      deleted_at: null,
      subtask_count: 0,
      last_logged_date: null
    };
  }

  async updateTitle(userId: string, titleId: string, input: UpdateTitleInput): Promise<Title | null> {
    await this.init();
    const pool = await this.getPool();
    const existing = await this.getTitleById(userId, titleId);
    if (!existing) return null;

    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [titleId, userId];
    let valIdx = 3;

    if (input.name !== undefined) {
      updates.push(`name = $${valIdx++}`);
      values.push(input.name.trim());
    }
    if (input.color !== undefined) {
      updates.push(`color = $${valIdx++}`);
      values.push(input.color);
    }
    if (input.icon !== undefined) {
      updates.push(`icon = $${valIdx++}`);
      values.push(input.icon);
    }
    if (input.is_archived !== undefined) {
      updates.push(`is_archived = $${valIdx++}`);
      values.push(input.is_archived);
    }
    if (input.sort_order !== undefined) {
      updates.push(`sort_order = $${valIdx++}`);
      values.push(input.sort_order);
    }

    const query = `UPDATE titles SET ${updates.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`;
    await pool.query(query, values);
    return this.getTitleById(userId, titleId);
  }

  async deleteTitle(userId: string, titleId: string): Promise<boolean> {
    await this.init();
    const pool = await this.getPool();
    const res = await pool.query(
      `UPDATE titles SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [titleId, userId]
    );
    if ((res.rowCount ?? 0) > 0) {
      await pool.query(
        `UPDATE subtasks SET deleted_at = NOW(), updated_at = NOW() WHERE title_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [titleId, userId]
      );
      return true;
    }
    return false;
  }

  // SUBTASKS
  async getSubtasks(userId: string, filter: Partial<FilterSubtasksInput> = {}): Promise<{ items: Subtask[]; total: number }> {
    await this.init();
    const pool = await this.getPool();
    let conditions: string[] = ['s.user_id = $1', 's.deleted_at IS NULL'];
    let values: any[] = [userId];
    let valIdx = 2;

    if (filter.title_ids && filter.title_ids.length > 0) {
      conditions.push(`s.title_id = ANY($${valIdx++})`);
      values.push(filter.title_ids);
    }

    if (filter.status) {
      conditions.push(`s.status = $${valIdx++}`);
      values.push(filter.status);
    }

    let startDate = filter.start_date;
    let endDate = filter.end_date;
    if (filter.date_preset) {
      const presetRange = getDateRangeFromPreset(filter.date_preset);
      startDate = presetRange.startDate;
      endDate = presetRange.endDate;
    }

    if (startDate) {
      conditions.push(`s.entry_date >= $${valIdx++}`);
      values.push(startDate);
    }
    if (endDate) {
      conditions.push(`s.entry_date <= $${valIdx++}`);
      values.push(endDate);
    }

    if (filter.search) {
      conditions.push(`s.description ILIKE $${valIdx++}`);
      values.push(`%${filter.search}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Total count query
    const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM subtasks s WHERE ${whereClause}`, values);
    const total = countRes.rows[0]?.total || 0;

    // Sorting
    const sortField = filter.sort_by === 'created_at' ? 's.created_at' : filter.sort_by === 'sort_order' ? 's.sort_order' : 's.entry_date';
    const sortDir = (filter.sort_dir || 'desc').toUpperCase();

    // Pagination
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const offset = (page - 1) * limit;

    const dataQuery = `
      SELECT s.*, t.name as title_name, t.color as title_color
      FROM subtasks s
      JOIN titles t ON t.id = s.title_id
      WHERE ${whereClause}
      ORDER BY ${sortField} ${sortDir}, s.sort_order ASC
      LIMIT $${valIdx++} OFFSET $${valIdx++}
    `;
    values.push(limit, offset);

    const dataRes = await pool.query(dataQuery, values);
    const items: Subtask[] = dataRes.rows.map((row: any): Subtask => ({
      id: row.id,
      title_id: row.title_id,
      user_id: row.user_id,
      description: row.description,
      entry_date: typeof row.entry_date === 'string' ? row.entry_date.split('T')[0] : new Date(row.entry_date).toISOString().split('T')[0],
      status: row.status,
      tags: row.tags || [],
      cost: row.cost !== null && row.cost !== undefined ? parseFloat(row.cost) : null,
      time_spent_minutes: row.time_spent_minutes !== null && row.time_spent_minutes !== undefined ? row.time_spent_minutes : null,
      sort_order: row.sort_order || 0,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
      title: {
        id: row.title_id,
        user_id: row.user_id,
        name: row.title_name,
        color: row.title_color,
        icon: 'folder',
        is_archived: false,
        sort_order: 0,
        created_at: new Date(row.created_at).toISOString(),
        updated_at: new Date(row.updated_at).toISOString(),
        deleted_at: null
      }
    }));

    return { items, total };
  }

  async getSubtaskById(userId: string, subtaskId: string): Promise<Subtask | null> {
    await this.init();
    const pool = await this.getPool();
    const res = await pool.query(
      `SELECT s.*, t.name as title_name, t.color as title_color
       FROM subtasks s
       JOIN titles t ON t.id = s.title_id
       WHERE s.id = $1 AND s.user_id = $2 AND s.deleted_at IS NULL`,
      [subtaskId, userId]
    );
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      title_id: row.title_id,
      user_id: row.user_id,
      description: row.description,
      entry_date: typeof row.entry_date === 'string' ? row.entry_date.split('T')[0] : new Date(row.entry_date).toISOString().split('T')[0],
      status: row.status,
      tags: row.tags || [],
      cost: row.cost !== null && row.cost !== undefined ? parseFloat(row.cost) : null,
      time_spent_minutes: row.time_spent_minutes !== null && row.time_spent_minutes !== undefined ? row.time_spent_minutes : null,
      sort_order: row.sort_order || 0,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
      title: {
        id: row.title_id,
        user_id: row.user_id,
        name: row.title_name,
        color: row.title_color,
        icon: 'folder',
        is_archived: false,
        sort_order: 0,
        created_at: new Date(row.created_at).toISOString(),
        updated_at: new Date(row.updated_at).toISOString(),
        deleted_at: null
      }
    };
  }

  async createSubtask(userId: string, input: CreateSubtaskInput): Promise<Subtask> {
    await this.init();
    const pool = await this.getPool();
    if (!isPastOrToday(input.entry_date)) {
      throw new Error('Future dates are strictly rejected. Entry date must be today or in the past.');
    }

    const title = await this.getTitleById(userId, input.title_id);
    if (!title) {
      throw new Error('Title (Category) not found or belongs to another user.');
    }

    const id = uuidv4();
    const res = await pool.query(
      `INSERT INTO subtasks (id, title_id, user_id, description, entry_date, status, tags, cost, time_spent_minutes, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        id,
        input.title_id,
        userId,
        input.description.trim(),
        input.entry_date,
        input.status || 'done',
        input.tags || [],
        input.cost !== undefined ? input.cost : null,
        input.time_spent_minutes !== undefined ? input.time_spent_minutes : null,
        input.sort_order || 0
      ]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      title_id: row.title_id,
      user_id: row.user_id,
      description: row.description,
      entry_date: typeof row.entry_date === 'string' ? row.entry_date.split('T')[0] : new Date(row.entry_date).toISOString().split('T')[0],
      status: row.status,
      tags: row.tags || [],
      cost: row.cost !== null && row.cost !== undefined ? parseFloat(row.cost) : null,
      time_spent_minutes: row.time_spent_minutes !== null && row.time_spent_minutes !== undefined ? row.time_spent_minutes : null,
      sort_order: row.sort_order || 0,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      deleted_at: null,
      title: {
        id: title.id,
        user_id: title.user_id,
        name: title.name,
        color: title.color,
        icon: title.icon,
        is_archived: title.is_archived,
        sort_order: title.sort_order,
        created_at: title.created_at,
        updated_at: title.updated_at,
        deleted_at: null
      }
    };
  }

  async updateSubtask(userId: string, subtaskId: string, input: UpdateSubtaskInput): Promise<Subtask | null> {
    await this.init();
    const pool = await this.getPool();
    const existing = await this.getSubtaskById(userId, subtaskId);
    if (!existing) return null;

    if (input.entry_date && !isPastOrToday(input.entry_date)) {
      throw new Error('Future dates are strictly rejected. Entry date must be today or in the past.');
    }

    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [subtaskId, userId];
    let valIdx = 3;

    if (input.title_id !== undefined) {
      const title = await this.getTitleById(userId, input.title_id);
      if (!title) throw new Error('Title not found or belongs to another user.');
      updates.push(`title_id = $${valIdx++}`);
      values.push(input.title_id);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${valIdx++}`);
      values.push(input.description.trim());
    }
    if (input.entry_date !== undefined) {
      updates.push(`entry_date = $${valIdx++}`);
      values.push(input.entry_date);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${valIdx++}`);
      values.push(input.status);
    }
    if (input.tags !== undefined) {
      updates.push(`tags = $${valIdx++}`);
      values.push(input.tags);
    }
    if (input.cost !== undefined) {
      updates.push(`cost = $${valIdx++}`);
      values.push(input.cost);
    }
    if (input.time_spent_minutes !== undefined) {
      updates.push(`time_spent_minutes = $${valIdx++}`);
      values.push(input.time_spent_minutes);
    }
    if (input.sort_order !== undefined) {
      updates.push(`sort_order = $${valIdx++}`);
      values.push(input.sort_order);
    }

    const query = `UPDATE subtasks SET ${updates.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`;
    await pool.query(query, values);
    return this.getSubtaskById(userId, subtaskId);
  }

  async deleteSubtask(userId: string, subtaskId: string): Promise<boolean> {
    await this.init();
    const pool = await this.getPool();
    const res = await pool.query(
      `UPDATE subtasks SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [subtaskId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async bulkDeleteSubtasks(userId: string, ids: string[]): Promise<number> {
    await this.init();
    const pool = await this.getPool();
    if (!ids.length) return 0;
    const res = await pool.query(
      `UPDATE subtasks SET deleted_at = NOW(), updated_at = NOW() WHERE id = ANY($1) AND user_id = $2 AND deleted_at IS NULL`,
      [ids, userId]
    );
    return res.rowCount ?? 0;
  }

  async reorderSubtasks(userId: string, _titleId: string, orderedIds: string[]): Promise<boolean> {
    await this.init();
    const pool = await this.getPool();
    for (let i = 0; i < orderedIds.length; i++) {
      await pool.query(
        `UPDATE subtasks SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
        [i, orderedIds[i], userId]
      );
    }
    return true;
  }

  // AUDIT LOGS
  async createAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string | null,
    details: Record<string, any>
  ): Promise<AuditLog> {
    await this.init();
    const pool = await this.getPool();
    const id = uuidv4();
    const res = await pool.query(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [id, userId, action, entityType, entityId, JSON.stringify(details || {})]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id || undefined,
      details: row.details || {},
      created_at: new Date(row.created_at).toISOString()
    };
  }

  async getAuditLogs(userId: string, limit = 50): Promise<AuditLog[]> {
    await this.init();
    const pool = await this.getPool();
    const res = await pool.query(
      `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return res.rows.map((row: any): AuditLog => ({
      id: row.id,
      user_id: row.user_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id || undefined,
      details: row.details || {},
      created_at: new Date(row.created_at).toISOString()
    }));
  }

  async exportAllUserData(userId: string): Promise<{ user: DbUser; titles: Title[]; subtasks: Subtask[]; auditLogs: AuditLog[] }> {
    await this.init();
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    const titles = await this.getTitles(userId, true);
    const { items: subtasks } = await this.getSubtasks(userId, { limit: 10000 });
    const auditLogs = await this.getAuditLogs(userId, 1000);

    return { user, titles, subtasks, auditLogs };
  }
}
