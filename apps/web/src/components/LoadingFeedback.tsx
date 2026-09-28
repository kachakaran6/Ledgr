import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { Skeleton } from './ui/skeleton';
import { AlertTriangleIcon, RotateCcwIcon } from './icons';
import { Button } from './ui/button';

/**
 * Standard inline spinner matching shadcn / app theme tokens.
 * Adapts to currentColor so it matches whatever button text/color it is placed inside.
 */
export interface InlineSpinnerProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const InlineSpinner: React.FC<InlineSpinnerProps> = ({
  className,
  size = 'sm',
}) => {
  const sizeMap = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <svg
      className={cn('animate-spin text-current shrink-0', sizeMap[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        className="opacity-85"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

/**
 * Skeleton Title Card matching the exact shape/size of real Task items in TaskList:
 * Icon circle, title text bar, subtitle bar with count & timestamp, "Open" arrow placeholder.
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-3 shadow-xs',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Skeleton className="h-2 w-2 rounded-full shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-36 sm:w-56 rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-16 rounded" />
            <span className="text-[10px] text-muted-foreground/30">•</span>
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Skeleton className="h-4 w-12 rounded" />
      </div>
    </div>
  );
};

/**
 * Renders multiple SkeletonCards in a vertical list.
 */
export const SkeletonCardList: React.FC<{ count?: number; className?: string }> = ({
  count = 4,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
};

/**
 * Skeleton Entry Row matching the exact row layout of SubtaskList & TaskDetailPage:
 * Status dot, optional title chip, description line, timestamp placeholder.
 */
export interface SkeletonRowProps {
  showTitleChip?: boolean;
  className?: string;
}

export const SkeletonRow: React.FC<SkeletonRowProps> = ({
  showTitleChip = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-xs',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="pt-0.5 shrink-0">
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {showTitleChip && (
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
            )}
            <Skeleton className="h-4 w-5/6 sm:w-3/4 rounded" />
            <Skeleton className="h-3 w-2/3 sm:w-1/2 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </div>
    </div>
  );
};

/**
 * Renders multiple SkeletonRows in a vertical list.
 */
export const SkeletonRowList: React.FC<{
  count?: number;
  showTitleChip?: boolean;
  className?: string;
}> = ({ count = 3, showTitleChip = true, className }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonRow key={idx} showTitleChip={showTitleChip} />
      ))}
    </div>
  );
};

/**
 * Inline Error component with a Retry button.
 * Shown whenever a data fetch fails, replacing skeletons.
 */
export interface InlineErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
  message = 'Failed to load data. Please check your connection.',
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'p-6 sm:p-8 rounded-xl border border-destructive/20 bg-destructive/5 text-center space-y-3 max-w-md mx-auto my-4',
        className
      )}
    >
      <div className="h-9 w-9 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
        <AlertTriangleIcon className="h-4 w-4" />
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-foreground">Something went wrong</h4>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="text-xs h-8 px-3 gap-1.5 font-medium hover:bg-muted"
        >
          <RotateCcwIcon className="h-3 w-3" />
          <span>Retry</span>
        </Button>
      )}
    </div>
  );
};

/**
 * Enforces a minimum visible duration (~300ms) for skeleton states.
 * Prevents jarring flash-then-replace on fast connections without adding
 * unnecessary artificial delay if the fetch took longer than minDurationMs.
 */
export function useDelayedLoading(isLoading: boolean, minDurationMs: number = 300): boolean {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);
  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      startTimeRef.current = Date.now();
      setShowSkeleton(true);
    } else {
      if (startTimeRef.current !== null) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = minDurationMs - elapsed;
        if (remaining > 0) {
          timeoutRef.current = setTimeout(() => {
            setShowSkeleton(false);
            startTimeRef.current = null;
          }, remaining);
        } else {
          setShowSkeleton(false);
          startTimeRef.current = null;
        }
      } else {
        setShowSkeleton(false);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, minDurationMs]);

  return showSkeleton;
}

/**
 * Generic debounce hook for search-as-you-type and rapid inputs.
 */
export function useDebounce<T>(value: T, delayMs: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
