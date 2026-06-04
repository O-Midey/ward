'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';
import { Icon } from './Icon';
import { scorePassword } from '@/lib/password';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  showStrength?: boolean;
}

const TONE_COLOR: Record<string, string> = {
  danger: 'var(--c-danger)',
  warning: 'var(--c-warning)',
  success: 'var(--c-success)',
};

export function PasswordField({ label, error, showStrength, className = '', id, value, ...props }: PasswordFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [reveal, setReveal] = useState(false);
  const strength = showStrength ? scorePassword(String(value ?? '')) : null;

  return (
    <div>
      {label && (
        <label htmlFor={fieldId} className="text-[0.7rem] font-bold text-text-tertiary uppercase tracking-[0.1em] mb-2 block">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={fieldId}
          type={reveal ? 'text' : 'password'}
          value={value}
          aria-invalid={!!error}
          className={`w-full px-4 py-3.5 pr-12 rounded-[var(--radius-lg)] bg-surface text-[0.9375rem] text-text
            placeholder:text-text-tertiary focus:outline-none transition-all
            shadow-[var(--shadow-card)] focus:shadow-[var(--ring-focus)]
            ${error ? 'ring-2 ring-danger/40' : ''} ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setReveal((r) => !r)}
          aria-label={reveal ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text press p-1.5"
        >
          <Icon name={reveal ? 'eye-off' : 'eye'} size={17} />
        </button>
      </div>

      {strength && strength.score > 0 && (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex-1 flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[3px] flex-1 rounded-full transition-colors duration-300"
                style={{ background: i <= strength.score ? TONE_COLOR[strength.tone] : 'var(--c-border)' }}
              />
            ))}
          </div>
          <span className="text-[0.7rem] font-semibold" style={{ color: TONE_COLOR[strength.tone] }}>
            {strength.label}
          </span>
        </div>
      )}

      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </div>
  );
}
