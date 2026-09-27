import * as React from 'react';
import { cn } from '../../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isAfter, startOfDay, subMonths, addMonths } from 'date-fns';
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
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date());

  const days = React.useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOfWeek = startOfMonth(currentMonth).getDay();
  const paddingDays = Array.from({ length: startDayOfWeek });

  return (
    <div className={cn('p-3 bg-card rounded-xl border border-border select-none', className)}>
      <div className="flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          disabled={!isAfter(startOfMonth(addMonths(currentMonth, 1)), startOfMonth(maxDate))}
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground font-medium mb-1">
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

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect?.(day)}
              className={cn(
                'h-8 w-8 rounded-md text-xs font-medium flex items-center justify-center transition-colors',
                isSelected
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                  : 'hover:bg-accent text-foreground hover:text-accent-foreground',
                isDisabled && 'opacity-25 cursor-not-allowed hover:bg-transparent text-muted-foreground'
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
