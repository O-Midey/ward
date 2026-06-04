'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

const BASE =
  'w-full px-4 py-3.5 rounded-[var(--radius-lg)] bg-surface text-text ' +
  'placeholder:text-text-tertiary focus:outline-none transition-all ' +
  'shadow-[var(--shadow-card)] focus:shadow-[var(--ring-focus)]';

const LABEL = 'text-[0.7rem] font-bold text-text-tertiary uppercase tracking-[0.1em] mb-2 block';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  adornment?: ReactNode;
  mono?: boolean;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, adornment, mono, className = '', id, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div>
      {label && <label htmlFor={fieldId} className={LABEL}>{label}</label>}
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          className={`${BASE} ${mono ? 'font-mono text-sm' : 'text-[0.9375rem]'} ${adornment ? 'pr-16' : ''} ${
            error ? 'ring-2 ring-danger/40' : ''
          } ${className}`}
          {...props}
        />
        {adornment && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-tertiary font-semibold">
            {adornment}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-sm text-danger mt-2">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-tertiary mt-2">{hint}</p>
      ) : null}
    </div>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, className = '', id, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div>
      {label && <label htmlFor={fieldId} className={LABEL}>{label}</label>}
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        className={`${BASE} resize-none font-mono text-sm leading-relaxed ${error ? 'ring-2 ring-danger/40' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </div>
  );
});
