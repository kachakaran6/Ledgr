import * as React from 'react';
import { cn } from '../../lib/utils';

export function Tooltip({
  content,
  children,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md animate-in fade-in-0 zoom-in-95 pointer-events-none z-50',
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
