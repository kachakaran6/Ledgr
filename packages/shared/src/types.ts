import { z } from 'zod';
import {
  SignUpSchema,
  LoginSchema,
  CreateTitleSchema,
  UpdateTitleSchema,
  CreateSubtaskSchema,
  UpdateSubtaskSchema,
  FilterSubtasksSchema,
  ExportRequestSchema,
  SyncMutationSchema,
  SyncBatchSchema,
  AuditLogSchema
} from './schemas';
import type { SubtaskStatus } from './constants';
export type { SubtaskStatus, DatePreset, ExportFormat, AuditAction } from './constants';

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export type CreateTitleInput = z.infer<typeof CreateTitleSchema>;
export type UpdateTitleInput = z.infer<typeof UpdateTitleSchema>;

export interface Title {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  subtask_count?: number;
  last_logged_date?: string | null;
}

export type CreateSubtaskInput = z.infer<typeof CreateSubtaskSchema>;
export type UpdateSubtaskInput = z.infer<typeof UpdateSubtaskSchema>;

export interface Subtask {
  id: string;
  title_id: string;
  user_id: string;
  description: string;
  entry_date: string; // YYYY-MM-DD
  status: SubtaskStatus;
  tags: string[];
  cost: number | null;
  time_spent_minutes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  title?: Title;
}

export type FilterSubtasksInput = z.infer<typeof FilterSubtasksSchema>;
export type ExportRequestInput = z.infer<typeof ExportRequestSchema>;
export type SyncMutation = z.infer<typeof SyncMutationSchema>;
export type SyncBatchInput = z.infer<typeof SyncBatchSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface AuthSession {
  user: User;
  token: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp?: string;
  };
}

export interface SyncResponse {
  appliedCount: number;
  conflicts: Array<{
    mutationId: string;
    serverRecord: Title | Subtask | null;
    reason: string;
  }>;
  serverChanges: {
    titles: Title[];
    subtasks: Subtask[];
    syncedAt: string;
  };
}
