import { describe, it, expect } from 'vitest';
import {
  getTodayDateString,
  getYesterdayDateString,
  isPastOrToday,
  formatDisplayDate,
  getDateRangeFromPreset,
  normalizeDateString
} from '../dates';

describe('Date Utilities & Past-Only Validation', () => {
  const refDate = new Date('2026-09-27T12:00:00.000Z');

  it('correctly calculates today and yesterday in YYYY-MM-DD', () => {
    expect(getTodayDateString(refDate)).toBe('2026-09-27');
    expect(getYesterdayDateString(refDate)).toBe('2026-09-26');
  });

  it('validates past and today dates as true', () => {
    expect(isPastOrToday('2026-09-27', refDate)).toBe(true);
    expect(isPastOrToday('2026-09-26', refDate)).toBe(true);
    expect(isPastOrToday('2025-01-01', refDate)).toBe(true);
    expect(isPastOrToday('2020-12-31', refDate)).toBe(true);
  });

  it('strictly rejects any future dates', () => {
    expect(isPastOrToday('2026-09-28', refDate)).toBe(false);
    expect(isPastOrToday('2026-10-01', refDate)).toBe(false);
    expect(isPastOrToday('2030-01-01', refDate)).toBe(false);
  });

  it('formats display dates correctly', () => {
    expect(formatDisplayDate('2026-09-27', refDate)).toBe('Today');
    expect(formatDisplayDate('2026-09-26', refDate)).toBe('Yesterday');
    expect(formatDisplayDate('2026-09-20', refDate)).toBe('20 Sep 2026');
  });

  it('computes preset date ranges accurately', () => {
    expect(getDateRangeFromPreset('today', refDate)).toEqual({
      startDate: '2026-09-27',
      endDate: '2026-09-27'
    });
    expect(getDateRangeFromPreset('yesterday', refDate)).toEqual({
      startDate: '2026-09-26',
      endDate: '2026-09-26'
    });
    expect(getDateRangeFromPreset('last_7_days', refDate)).toEqual({
      startDate: '2026-09-21',
      endDate: '2026-09-27'
    });
  });

  it('normalizes various date inputs', () => {
    expect(normalizeDateString('2026-09-27')).toBe('2026-09-27');
    expect(normalizeDateString(new Date(2026, 8, 27))).toBe('2026-09-27');
  });
});
