import type { Title, Subtask, AuditLog, CreateTitleInput, UpdateTitleInput, CreateSubtaskInput, UpdateSubtaskInput, FilterSubtasksInput } from '@ledgr/shared';

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

export interface IDatabase {
  // Users
  createUser(email: string, passwordHash: string, name?: string): Promise<DbUser>;
  getUserByEmail(email: string): Promise<DbUser | null>;
  getUserById(id: string): Promise<DbUser | null>;
  deleteUser(userId: string): Promise<boolean>;

  // Titles (Strictly user-scoped / RLS)
  getTitles(userId: string, includeArchived?: boolean): Promise<Title[]>;
  getTitleById(userId: string, titleId: string): Promise<Title | null>;
  createTitle(userId: string, input: CreateTitleInput): Promise<Title>;
  updateTitle(userId: string, titleId: string, input: UpdateTitleInput): Promise<Title | null>;
  deleteTitle(userId: string, titleId: string): Promise<boolean>;

  // Subtasks (Strictly user-scoped / RLS)
  getSubtasks(userId: string, filter: FilterSubtasksInput): Promise<{ items: Subtask[]; total: number }>;
  getSubtaskById(userId: string, subtaskId: string): Promise<Subtask | null>;
  createSubtask(userId: string, input: CreateSubtaskInput): Promise<Subtask>;
  updateSubtask(userId: string, subtaskId: string, input: UpdateSubtaskInput): Promise<Subtask | null>;
  deleteSubtask(userId: string, subtaskId: string): Promise<boolean>;
  bulkDeleteSubtasks(userId: string, ids: string[]): Promise<number>;
  reorderSubtasks(userId: string, titleId: string, orderedIds: string[]): Promise<boolean>;

  // Audit Logs
  createAuditLog(userId: string, action: string, entityType: string, entityId: string | null, details: Record<string, any>): Promise<AuditLog>;
  getAuditLogs(userId: string, limit?: number): Promise<AuditLog[]>;

  // Export all user data (GDPR requirement)
  exportAllUserData(userId: string): Promise<{ user: DbUser; titles: Title[]; subtasks: Subtask[]; auditLogs: AuditLog[] }>;

  // Reset / Clear (for testing)
  reset?(): Promise<void>;
}
