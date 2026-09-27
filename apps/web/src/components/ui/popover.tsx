import * as React from 'react';
import { cn } from '../../lib/utils';

interface PopoverContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const PopoverContext = React.createContext<PopoverContextType>({
  open: false,
  setOpen: () => {},
});

export function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
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
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} className="relative inline-block">
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  asChild,
  children,
  ...props
}: {
  asChild?: boolean;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = React.useContext(PopoverContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => setOpen(!open),
    });
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      {...props}
    >
      {children}
    </button>
  );
}

export function PopoverContent({
  align = 'center',
  className,
  children,
}: {
  align?: 'start' | 'center' | 'end';
  className?: string;
  children: React.ReactNode;
}) {
  const { open } = React.useContext(PopoverContext);
  if (!open) return null;

  const alignStyles = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <div
      className={cn(
        'absolute z-50 mt-2 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg outline-none animate-in fade-in-0 zoom-in-95',
        alignStyles[align],
        className
      )}
    >
      {children}
    </div>
  );
}
