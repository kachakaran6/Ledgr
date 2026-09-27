import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'accent';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none';

    const variantStyles = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-[0.98]',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm active:scale-[0.98]',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
      accent: 'bg-accent text-accent-foreground hover:bg-accent/80',
    };

    const sizeStyles = {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-10 rounded-lg px-8 text-base',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
