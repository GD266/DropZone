import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-0 disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    primary: 'bg-accent hover:bg-accent-hover text-white focus:ring-accent/50 shadow-sm',
    secondary: 'bg-surface-2 border border-border hover:border-border-hover hover:bg-surface-3 text-text-primary focus:ring-border-hover',
    ghost: 'hover:bg-surface-2 text-text-secondary hover:text-text-primary focus:ring-border',
    danger: 'bg-error/10 border border-error/20 text-error hover:bg-error/20 focus:ring-error/50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
    md: 'px-4 py-2 text-sm rounded-md gap-2',
    lg: 'px-6 py-3 text-base rounded-lg gap-2',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
