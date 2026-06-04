'use client';

// ============================================================
// Ward — IconButton
// ============================================================
// Icon-only button. `label` is required and wired to aria-label
// so these never ship as unlabelled tap targets.

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  size?: number;
  tone?: 'default' | 'accent';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, size = 20, tone = 'default', className = '', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={`press inline-flex items-center justify-center rounded-[var(--radius-md)]
        ${tone === 'accent' ? 'text-accent' : 'text-text-tertiary hover:text-text'}
        transition-colors ${className}`}
      {...props}
    >
      <Icon name={icon} size={size} />
    </button>
  );
});
