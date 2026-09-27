import { z } from 'zod';
import { isPastOrToday } from './dates';
import { SUBTASK_STATUSES, DATE_PRESETS, EXPORT_FORMATS, AUDIT_ACTIONS } from './constants';

/**
 * Past-only date schema.
 * Rejects any date that is in the future.
 */
export const pastOnlyDateSchema = z
  .string({ required_error: 'Date is required' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD')
  .refine((dateStr) => isPastOrToday(dateStr), {
    message: 'Future dates are not allowed. You can only log work for today or past dates.'
  });

// Auth Schemas
export const SignUpSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional()
});

export const LoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
});

// Title Schemas
export const CreateTitleSchema = z.object({
  name: z.string().trim().min(1, 'Title name is required').max(100, 'Title name cannot exceed 100 characters'),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Valid hex color required').default('#3b82f6'),
  icon: z.string().max(32).default('folder'),
  sort_order: z.number().int().optional().default(0)
});

export const UpdateTitleSchema = CreateTitleSchema.partial().extend({
  is_archived: z.boolean().optional()
});

// Subtask Schemas
export const CreateSubtaskSchema = z.object({
  title_id: z.string().uuid('Valid Title ID is required'),
  description: z.string().trim().min(1, 'Task description is required').max(2000, 'Description cannot exceed 2000 characters'),
  entry_date: pastOnlyDateSchema,
  status: z.enum(SUBTASK_STATUSES).default('done'),
  tags: z.array(z.string().trim().max(30)).default([]),
  cost: z.number().nonnegative('Cost must be non-negative').nullable().optional(),
  time_spent_minutes: z.number().int().nonnegative('Time spent must be non-negative').nullable().optional(),
  sort_order: z.number().int().optional().default(0)
});

export const UpdateSubtaskSchema = CreateSubtaskSchema.omit({ title_id: true }).partial().extend({
  title_id: z.string().uuid('Valid Title ID is required').optional()
});

export const BulkDeleteSubtasksSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID must be provided')
});

export const ReorderSubtasksSchema = z.object({
  title_id: z.string().uuid(),
  ordered_ids: z.array(z.string().uuid()).min(1)
});

// Filter & Query Schemas
export const FilterSubtasksSchema = z.object({
  search: z.string().trim().optional(),
  title_ids: z.union([z.string().uuid(), z.array(z.string().uuid())]).optional().transform((val) => {
    if (!val) return undefined;
    return Array.isArray(val) ? val : [val];
  }),
  date_preset: z.enum(DATE_PRESETS).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(SUBTASK_STATUSES).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional().transform((val) => {
    if (!val) return undefined;
    return Array.isArray(val) ? val : [val];
  }),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(5000).default(100),
  sort_by: z.enum(['entry_date', 'created_at', 'sort_order']).default('entry_date'),
  sort_dir: z.enum(['asc', 'desc']).default('desc')
});

// Export Schema
export const ExportRequestSchema = z.object({
  format: z.enum(EXPORT_FORMATS),
  title_ids: z.array(z.string().uuid()).optional(),
  subtask_ids: z.array(z.string().uuid()).optional(),
  filter: FilterSubtasksSchema.optional(),
  include_meta: z.boolean().default(true),
  filename_prefix: z.string().optional()
});

// Offline Sync Schema
export const SyncMutationSchema = z.object({
  id: z.string(),
  mutation_id: z.string().uuid(),
  type: z.enum(['CREATE_TITLE', 'UPDATE_TITLE', 'DELETE_TITLE', 'CREATE_SUBTASK', 'UPDATE_SUBTASK', 'DELETE_SUBTASK']),
  entity_id: z.string(),
  payload: z.record(z.any()),
  timestamp: z.number()
});

export const SyncBatchSchema = z.object({
  mutations: z.array(SyncMutationSchema),
  last_pulled_at: z.string().optional()
});

// Audit Schema
export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  action: z.enum(AUDIT_ACTIONS),
  entity_type: z.string(),
  entity_id: z.string().nullable(),
  details: z.record(z.any()),
  created_at: z.string()
});
