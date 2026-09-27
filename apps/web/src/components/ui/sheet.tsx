import * as React from 'react';
import { cn } from '../../lib/utils';
import { CloseIcon } from '../icons';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const SheetContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => {},
});

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {open && children}
    </SheetContext.Provider>
  );
}

export function SheetContent({
  side = 'bottom',
  className,
  children,
}: {
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  children: React.ReactNode;
}) {
  const { onOpenChange } = React.useContext(SheetContext);

  const sideStyles = {
    top: 'inset-x-0 top-0 border-b animate-in slide-in-from-top duration-300',
    bottom: 'inset-x-0 bottom-0 border-t rounded-t-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 pb-safe',
    left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r animate-in slide-in-from-left duration-300',
    right: 'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l animate-in slide-in-from-right duration-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          'fixed z-50 gap-4 bg-card p-6 shadow-xl transition ease-in-out border-border',
          sideStyles[side],
          className
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <CloseIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-2 text-center sm:text-left mb-4', className)}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold text-foreground', className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}
