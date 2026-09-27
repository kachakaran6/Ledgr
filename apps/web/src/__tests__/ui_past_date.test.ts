import { describe, it, expect } from 'vitest';
import { getTodayDateString, getYesterdayDateString, isPastOrToday } from '@ledgr/shared';
import { addDays, format } from 'date-fns';

describe('Web UI Past-Only Date Validation Layer', () => {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  it('validates today and yesterday as selectable dates', () => {
    expect(isPastOrToday(today)).toBe(true);
    expect(isPastOrToday(yesterday)).toBe(true);
  });

  it('blocks future dates from being accepted by UI validation', () => {
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    expect(isPastOrToday(tomorrowStr)).toBe(false);
  });
});
