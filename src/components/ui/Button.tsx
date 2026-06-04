'use client';

// ============================================================
// Ward — Button
// ============================================================
// The one button in the app. Variants, sizes, loading state,
// and accessible focus/press behaviour baked in.

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: IconName;
}

const VARIANT: Record<Variant, string> = {
  primary: 'text-[var(--c-on-accent)] shadow-[var(--shadow-accent)] relative overflow-hidden',
  secondary: 'bg-surface text-text shadow-[var(--shadow-card)]',
  ghost: 'bg-transparent text-text-secondary hover:text-text hover:bg-surface-2',
  danger: 'bg-danger text-white shadow-[0_4px_14px_-2px_rgba(220,38,38,0.4)]',
};

const SIZE: Record<Size, string> = {
  sm: 'py-2 px-3.5 text-sm rounded-[var(--radius-md)] gap-1.5',
  md: 'py-3 px-4 text-sm rounded-[var(--radius-md)] gap-2',
  lg: 'py-3.5 px-5 text-[0.9375rem] rounded-[var(--radius-lg)] gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'lg', loading = false, fullWidth = false, icon, disabled, children, className = '', style, ...props },
  ref,
) {
  const isPrimary = variant === 'primary';
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`press inline-flex items-center justify-center font-semibold tracking-tight leading-none
        transition-colors disabled:opacity-35 disabled:cursor-not-allowed
        ${VARIANT[variant]} ${SIZE[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        ...(isPrimary ? { background: 'var(--grad-accent)' } : {}),
        ...style,
      }}
      {...props}
    >
      {isPrimary && (
        <span
          className="absolute inset-0 rounded-inherit pointer-events-none"
          style={{ background: 'linear-gradient(165deg, rgba(255,255,255,0.13) 0%, transparent 55%)' }}
        />
      )}
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin opacity-80"
            aria-hidden="true"
          />
          {children}
        </span>
      ) : (
        <>
          {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
          {children}
        </>
      )}
    </button>
  );
});
