import * as React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDownIcon, CheckIcon } from '../icons';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedLabel: React.ReactNode;
  setSelectedLabel: React.Dispatch<React.SetStateAction<React.ReactNode>>;
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined);

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedLabel, setSelectedLabel] = React.useState<React.ReactNode>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

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

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange,
        open,
        setOpen,
        selectedLabel,
        setSelectedLabel,
      }}
    >
      <div ref={containerRef} className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: React.ReactNode;
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error('SelectTrigger must be used within a Select');

    const { open, setOpen } = context;

    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground transition-colors hover:border-muted-foreground/40 font-heading font-medium text-left',
          open && 'ring-1 ring-ring border-ring',
          className
        )}
        {...props}
      >
        <span className="truncate flex-1">{children}</span>
        <ChevronDownIcon className={cn('h-4 w-4 opacity-50 shrink-0 ml-2 transition-transform duration-200', open && 'rotate-180')} />
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

export interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export function SelectValue({ placeholder, className }: SelectValueProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within a Select');

  const { selectedLabel, value } = context;

  return (
    <span className={cn('block truncate', !value && 'text-muted-foreground', className)}>
      {selectedLabel || placeholder || value || ''}
    </span>
  );
}

export interface SelectContentProps {
  className?: string;
  children: React.ReactNode;
}

export function SelectContent({ className, children }: SelectContentProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectContent must be used within a Select');

  const { open } = context;
  if (!open) return null;

  return (
    <div
      className={cn(
        'absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 min-w-[8rem] overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function SelectItem({ value, children, className, ...props }: SelectItemProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within a Select');

  const { value: selectedValue, onValueChange, setOpen, setSelectedLabel } = context;
  const isSelected = selectedValue === value;

  React.useEffect(() => {
    if (isSelected) {
      setSelectedLabel(children);
    }
  }, [isSelected, children, setSelectedLabel]);

  const handleSelect = () => {
    onValueChange(value);
    setSelectedLabel(children);
    setOpen(false);
  };

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={handleSelect}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center justify-between rounded-md py-2 px-2.5 text-xs font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        isSelected && 'bg-accent/70 font-semibold text-accent-foreground',
        className
      )}
      {...props}
    >
      <span className="truncate flex-1">{children}</span>
      {isSelected && <CheckIcon className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
    </div>
  );
}
