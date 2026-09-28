import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'done' | 'inProgress' | 'cancelled' | 'accent';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'border-transparent bg-primary text-primary-foreground shadow',
    secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'border-transparent bg-destructive text-destructive-foreground shadow',
    outline: 'text-foreground border-border',
    done: 'border-transparent bg-status-done text-primary-foreground shadow-sm font-medium',
    inProgress: 'border-transparent bg-status-inprogress text-primary-foreground shadow-sm font-medium',
    cancelled: 'border-transparent bg-status-cancelled text-primary-foreground shadow-sm font-medium',
    accent: 'border-transparent bg-accent text-accent-foreground',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
