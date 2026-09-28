import * as React from 'react';
import { cn } from '../../lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarIcon, ChevronDownIcon } from '../icons';
import { Calendar } from './calendar';

export interface DatePickerProps {
  value: string; // ISO date string YYYY-MM-DD
  onChange: (value: string) => void;
  maxDate?: Date;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  maxDate = new Date(),
  placeholder = 'Pick a date',
  className,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = parseISO(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleSelectDate = (d: Date) => {
    // Format to YYYY-MM-DD local ISO
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
    setOpen(false);
  };

  const displayText = parsedDate
    ? format(parsedDate, 'dd MMM yyyy')
    : placeholder;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground transition-colors hover:border-muted-foreground/40 font-mono text-left cursor-pointer',
          open && 'ring-1 ring-ring border-ring',
          !parsedDate && 'text-muted-foreground font-normal',
          className
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">{displayText}</span>
        </div>
        <ChevronDownIcon
          className={cn(
            'h-3.5 w-3.5 opacity-50 shrink-0 ml-2 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1.5 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95">
          <Calendar
            selected={parsedDate}
            onSelect={handleSelectDate}
            maxDate={maxDate}
            className="border-none shadow-none"
          />
        </div>
      )}
    </div>
  );
}
