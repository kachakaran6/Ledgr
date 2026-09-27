import { describe, it, expect } from 'vitest';
import {
  CreateSubtaskSchema,
  CreateTitleSchema,
  FilterSubtasksSchema,
  ExportRequestSchema
} from '../schemas';
import { getTodayDateString, getYesterdayDateString } from '../dates';
import { addDays, format } from 'date-fns';

describe('Shared Zod Schemas Validation', () => {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  it('allows valid subtask creation with today and yesterday dates', () => {
    const validToday = CreateSubtaskSchema.safeParse({
      title_id: '123e4567-e89b-12d3-a456-426614174000',
      description: 'Replaced brake pads and oil filter',
      entry_date: today,
      status: 'done',
      cost: 150.50,
      time_spent_minutes: 90
    });
    expect(validToday.success).toBe(true);

    const validYesterday = CreateSubtaskSchema.safeParse({
      title_id: '123e4567-e89b-12d3-a456-426614174000',
      description: 'Diagnosed transmission sound',
      entry_date: yesterday,
      status: 'in_progress'
    });
    expect(validYesterday.success).toBe(true);
  });

  it('strictly rejects future dates in subtask creation schema', () => {
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    const futureResult = CreateSubtaskSchema.safeParse({
      title_id: '123e4567-e89b-12d3-a456-426614174000',
      description: 'Future work attempt',
      entry_date: tomorrowStr
    });

    expect(futureResult.success).toBe(false);
    if (!futureResult.success) {
      expect(futureResult.error.errors[0]?.message).toContain('Future dates are not allowed');
    }
  });

  it('validates title creation schema', () => {
    const validTitle = CreateTitleSchema.safeParse({
      name: 'Garage Client A',
      color: '#ef4444'
    });
    expect(validTitle.success).toBe(true);

    const emptyName = CreateTitleSchema.safeParse({
      name: '   ',
      color: '#ef4444'
    });
    expect(emptyName.success).toBe(false);
  });

  it('validates export request schema', () => {
    const validExport = ExportRequestSchema.safeParse({
      format: 'pdf',
      title_ids: ['123e4567-e89b-12d3-a456-426614174000'],
      include_meta: true
    });
    expect(validExport.success).toBe(true);
  });

  it('validates filter subtasks schema', () => {
    const validFilter = FilterSubtasksSchema.safeParse({
      search: 'brake repair',
      date_preset: 'last_7_days',
      status: 'done',
    });
    expect(validFilter.success).toBe(true);
  });
});
