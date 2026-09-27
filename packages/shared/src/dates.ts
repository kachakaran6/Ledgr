import { format, parseISO, startOfDay, isAfter, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { DatePreset } from './constants';

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayDateString(referenceDate = new Date()): string {
  return format(referenceDate, 'yyyy-MM-dd');
}

/**
 * Returns yesterday's date formatted as YYYY-MM-DD in local time
 */
export function getYesterdayDateString(referenceDate = new Date()): string {
  return format(subDays(referenceDate, 1), 'yyyy-MM-dd');
}

/**
 * Normalizes input into YYYY-MM-DD string
 */
export function normalizeDateString(input: string | Date): string {
  if (typeof input === 'string') {
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return input;
    }
    const parsed = parseISO(input);
    if (!isNaN(parsed.getTime())) {
      return format(parsed, 'yyyy-MM-dd');
    }
  } else if (input instanceof Date && !isNaN(input.getTime())) {
    return format(input, 'yyyy-MM-dd');
  }
  throw new Error(`Invalid date input: ${String(input)}`);
}

/**
 * Validates whether a given date is strictly today or in the past.
 * Rejects future dates.
 */
export function isPastOrToday(dateStr: string, referenceDate = new Date()): boolean {
  try {
    const norm = normalizeDateString(dateStr);
    const [year, month, day] = norm.split('-').map(Number);
    if (!year || !month || !day) return false;

    const inputDate = startOfDay(new Date(year, month - 1, day));
    const today = startOfDay(referenceDate);

    // Date must not be strictly after today
    return !isAfter(inputDate, today);
  } catch {
    return false;
  }
}

/**
 * Formats a YYYY-MM-DD string into a human-friendly string:
 * "Today", "Yesterday", or "27 Sep 2026"
 */
export function formatDisplayDate(dateStr: string, referenceDate = new Date()): string {
  try {
    const norm = normalizeDateString(dateStr);
    const todayStr = getTodayDateString(referenceDate);
    const yesterdayStr = getYesterdayDateString(referenceDate);

    if (norm === todayStr) {
      return 'Today';
    }
    if (norm === yesterdayStr) {
      return 'Yesterday';
    }

    const [year, month, day] = norm.split('-').map(Number);
    const dateObj = new Date(year!, month! - 1, day!);
    return format(dateObj, 'd MMM yyyy');
  } catch {
    return dateStr;
  }
}

/**
 * Calculates start and end YYYY-MM-DD for preset filters
 */
export function getDateRangeFromPreset(preset: DatePreset, referenceDate = new Date()): { startDate?: string; endDate?: string } {
  const today = getTodayDateString(referenceDate);
  const yesterday = getYesterdayDateString(referenceDate);

  switch (preset) {
    case 'today':
      return { startDate: today, endDate: today };
    case 'yesterday':
      return { startDate: yesterday, endDate: yesterday };
    case 'last_7_days':
      return { startDate: format(subDays(referenceDate, 6), 'yyyy-MM-dd'), endDate: today };
    case 'this_month':
      return { startDate: format(startOfMonth(referenceDate), 'yyyy-MM-dd'), endDate: today };
    case 'last_month': {
      const prevMonth = subMonths(referenceDate, 1);
      return {
        startDate: format(startOfMonth(prevMonth), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(prevMonth), 'yyyy-MM-dd')
      };
    }
    case 'all':
    case 'custom':
    default:
      return {};
  }
}
