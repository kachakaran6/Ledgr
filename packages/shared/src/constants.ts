export const SUBTASK_STATUSES = ['done', 'in_progress', 'cancelled'] as const;
export type SubtaskStatus = (typeof SUBTASK_STATUSES)[number];

export const DATE_PRESETS = [
  'today',
  'yesterday',
  'last_7_days',
  'this_month',
  'last_month',
  'all',
  'custom'
] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export const EXPORT_FORMATS = ['pdf', 'xlsx', 'csv'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const AUDIT_ACTIONS = [
  'AUTH_SIGNUP',
  'AUTH_LOGIN',
  'CREATE_TITLE',
  'UPDATE_TITLE',
  'DELETE_TITLE',
  'ARCHIVE_TITLE',
  'CREATE_SUBTASK',
  'UPDATE_SUBTASK',
  'DELETE_SUBTASK',
  'BULK_DELETE_SUBTASKS',
  'EXPORT_DATA',
  'SYNC_BATCH'
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const ERROR_CODES = {
  FUTURE_DATE_NOT_ALLOWED: 'FUTURE_DATE_NOT_ALLOWED',
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;
