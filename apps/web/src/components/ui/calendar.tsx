import * as React from 'react';
import { cn } from '../../lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isAfter,
  startOfDay,
  subMonths,
  addMonths,
} from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons';

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  disabledDates?: (date: Date) => boolean;
  className?: string;
  maxDate?: Date;
}

export function Calendar({
  selected,
  onSelect,
  disabledDates = (date) => isAfter(startOfDay(date), startOfDay(new Date())),
  maxDate = new Date(),
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => selected || new Date());

  React.useEffect(() => {
    if (selected) {
      setCurrentMonth(selected);
    }
  }, [selected]);

  const days = React.useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOfWeek = startOfMonth(currentMonth).getDay();
  const paddingDays = Array.from({ length: startDayOfWeek });

  const isNextDisabled = isAfter(startOfMonth(addMonths(currentMonth, 1)), startOfMonth(maxDate));

  return (
    <div className={cn('p-3 bg-card rounded-xl border border-border select-none shadow-sm', className)}>
      <div className="flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Previous Month"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold text-foreground tracking-tight">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          disabled={isNextDisabled}
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Next Month"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">
        <div>Su</div>
        <div>Mo</div>
        <div>Tu</div>
        <div>We</div>
        <div>Th</div>
        <div>Fr</div>
        <div>Sa</div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((_, i) => (
          <div key={`pad-${i}`} className="h-8 w-8" />
        ))}
        {days.map((day) => {
          const isSelected = selected && isSameDay(day, selected);
          const isDisabled = disabledDates(day);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect?.(day)}
              className={cn(
                'h-8 w-8 rounded-md text-xs font-medium flex items-center justify-center transition-all cursor-pointer',
                isSelected
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : isToday
                  ? 'bg-muted text-foreground font-semibold border border-primary/40'
                  : 'hover:bg-accent text-foreground hover:text-accent-foreground',
                isDisabled && 'opacity-25 cursor-not-allowed hover:bg-transparent text-muted-foreground pointer-events-none'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
