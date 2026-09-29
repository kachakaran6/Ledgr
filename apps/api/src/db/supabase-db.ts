import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

export class SupabaseDatabase implements IDatabase {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  // Users
  async createUser(email: string, passwordHash: string, name?: string): Promise<DbUser> {
    const { data: authData, error: authError } = await this.client.auth.admin.createUser({
      email,
      password: passwordHash, // or user metadata
      user_metadata: { name }
    });
    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to create user in Supabase');
    }
    return {
      id: authData.user.id,
      email: authData.user.email!,
      password_hash: '',
      name,
      created_at: authData.user.created_at,
      updated_at: authData.user.updated_at || authData.user.created_at
    };
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    const { data, error } = await this.client.auth.admin.listUsers();
    if (error) return null;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) return null;
    return {
      id: found.id,
      email: found.email!,
      password_hash: '',
      name: found.user_metadata?.name,
      created_at: found.created_at,
      updated_at: found.updated_at || found.created_at
    };
  }

  async getUserById(id: string): Promise<DbUser | null> {
    const { data, error } = await this.client.auth.admin.getUserById(id);
    if (error || !data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email!,
      password_hash: '',
      name: data.user.user_metadata?.name,
      created_at: data.user.created_at,
      updated_at: data.user.updated_at || data.user.created_at
    };
  }

  async deleteUser(userId: string): Promise<boolean> {
    const { error } = await this.client.auth.admin.deleteUser(userId);
    return !error;
  }

  // Titles (Postgres RLS enforced)
  async getTitles(userId: string, includeArchived = false): Promise<Title[]> {
    let query = this.client
      .from('titles')
      .select('*, subtasks(count, entry_date)')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) throw new Error(error.message);

    return (data || []).map((t: any) => ({
      id: t.id,
      user_id: t.user_id,
      name: t.name,
      color: t.color,
      icon: t.icon,
      is_archived: t.is_archived,
      sort_order: t.sort_order,
      created_at: t.created_at,
      updated_at: t.updated_at,
      deleted_at: t.deleted_at,
      subtask_count: t.subtasks?.[0]?.count ?? 0,
      last_logged_date: t.subtasks?.[0]?.entry_date ?? null
    }));
  }

  async getTitleById(userId: string, titleId: string): Promise<Title | null> {
    const { data, error } = await this.client
      .from('titles')
      .select('*')
      .eq('id', titleId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return data as Title;
  }

  async createTitle(userId: string, input: CreateTitleInput): Promise<Title> {
    const { data, error } = await this.client
      .from('titles')
      .insert({
        user_id: userId,
        name: input.name,
        color: input.color || '#3b82f6',
        icon: input.icon || 'folder',
        sort_order: input.sort_order ?? 0
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create title');
    return data as Title;
  }

  async updateTitle(userId: string, titleId: string, input: UpdateTitleInput): Promise<Title | null> {
    const { data, error } = await this.client
      .from('titles')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', titleId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) return null;
    return data as Title;
  }

  async deleteTitle(userId: string, titleId: string): Promise<boolean> {
    const { error } = await this.client
      .from('titles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', titleId)
      .eq('user_id', userId);

    return !error;
  }

  // Subtasks
  async getSubtasks(userId: string, filter: FilterSubtasksInput): Promise<{ items: Subtask[]; total: number }> {
    let query = this.client
      .from('subtasks')
      .select('*, titles(id, name, color, icon)', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (filter.title_ids && filter.title_ids.length > 0) {
      query = query.in('title_id', filter.title_ids);
    }

    if (filter.status) {
      query = query.eq('status', filter.status);
    }

    let { startDate, endDate } = filter.date_preset ? getDateRangeFromPreset(filter.date_preset) : { startDate: filter.start_date, endDate: filter.end_date };
    if (!startDate && filter.start_date) startDate = filter.start_date;
    if (!endDate && filter.end_date) endDate = filter.end_date;

    if (startDate) query = query.gte('entry_date', startDate);
    if (endDate) query = query.lte('entry_date', endDate);

    if (filter.search) {
      query = query.ilike('description', `%${filter.search}%`);
    }

    const sortCol = filter.sort_by === 'created_at' ? 'created_at' : filter.sort_by === 'sort_order' ? 'sort_order' : 'entry_date';
    query = query.order(sortCol, { ascending: filter.sort_dir === 'asc' });

    const page = filter.page || 1;
    const limit = filter.limit || 100;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const items = (data || []).map((s: any) => ({
      ...s,
      cost: s.cost !== null && s.cost !== undefined && s.cost !== '' ? parseFloat(s.cost) : null,
      time_spent_minutes: s.time_spent_minutes !== null && s.time_spent_minutes !== undefined && s.time_spent_minutes !== '' ? parseInt(s.time_spent_minutes, 10) : null,
      title: s.titles
    }));

    return { items, total: count || items.length };
  }

  async getSubtaskById(userId: string, subtaskId: string): Promise<Subtask | null> {
    const { data, error } = await this.client
      .from('subtasks')
      .select('*, titles(id, name, color, icon)')
      .eq('id', subtaskId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return {
      ...data,
      cost: data.cost !== null && data.cost !== undefined && data.cost !== '' ? parseFloat(data.cost) : null,
      time_spent_minutes: data.time_spent_minutes !== null && data.time_spent_minutes !== undefined && data.time_spent_minutes !== '' ? parseInt(data.time_spent_minutes, 10) : null,
      title: data.titles
    } as Subtask;
  }

  async createSubtask(userId: string, input: CreateSubtaskInput): Promise<Subtask> {
    if (!isPastOrToday(input.entry_date)) {
      throw new Error('CHECK CONSTRAINT VIOLATION: entry_date must be <= CURRENT_DATE (future dates rejected)');
    }

    const { data, error } = await this.client
      .from('subtasks')
      .insert({
        title_id: input.title_id,
        user_id: userId,
        description: input.description,
        entry_date: input.entry_date,
        status: input.status || 'done',
        tags: input.tags || [],
        cost: input.cost ?? null,
        time_spent_minutes: input.time_spent_minutes ?? null,
        sort_order: input.sort_order ?? 0
      })
      .select('*, titles(id, name, color, icon)')
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create subtask');
    return { ...data, title: data.titles } as Subtask;
  }

  async updateSubtask(userId: string, subtaskId: string, input: UpdateSubtaskInput): Promise<Subtask | null> {
    if (input.entry_date && !isPastOrToday(input.entry_date)) {
      throw new Error('CHECK CONSTRAINT VIOLATION: entry_date must be <= CURRENT_DATE (future dates rejected)');
    }

    const { data, error } = await this.client
      .from('subtasks')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', subtaskId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select('*, titles(id, name, color, icon)')
      .single();

    if (error || !data) return null;
    return { ...data, title: data.titles } as Subtask;
  }

  async deleteSubtask(userId: string, subtaskId: string): Promise<boolean> {
    const { error } = await this.client
      .from('subtasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', subtaskId)
      .eq('user_id', userId);

    return !error;
  }

  async bulkDeleteSubtasks(userId: string, ids: string[]): Promise<number> {
    const { data, error } = await this.client
      .from('subtasks')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', userId)
      .select('id');

    if (error) throw new Error(error.message);
    return data?.length || 0;
  }

  async reorderSubtasks(userId: string, _titleId: string, orderedIds: string[]): Promise<boolean> {
    const updates = orderedIds.map((id, index) =>
      this.client.from('subtasks').update({ sort_order: index }).eq('id', id).eq('user_id', userId)
    );
    await Promise.all(updates);
    return true;
  }

  // Audit Logs
  async createAuditLog(userId: string, action: string, entityType: string, entityId: string | null, details: Record<string, any>): Promise<AuditLog> {
    const { data, error } = await this.client
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to record audit log');
    return data as AuditLog;
  }

  async getAuditLogs(userId: string, limit = 50): Promise<AuditLog[]> {
    const { data, error } = await this.client
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data || []) as AuditLog[];
  }

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
