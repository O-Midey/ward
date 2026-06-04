'use client';

// ============================================================
// Ward — Error Boundary
// ============================================================
// Catches render errors anywhere in the tree and shows a
// recoverable fallback instead of a blank white screen.

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Surfaced to the console; no third-party error tracking by design.
    console.error('Ward render error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="h-dvh w-full flex flex-col items-center justify-center px-8 text-center bg-bg">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'var(--c-danger-subtle)', color: 'var(--c-danger)' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        </div>
        <h1 className="font-display text-2xl text-text mb-2">Something went wrong</h1>
        <p className="text-sm text-text-secondary max-w-xs mb-6 leading-relaxed">
          Ward hit an unexpected error. Your keys are safe — they&apos;re encrypted on this device. Reload to continue.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-3 rounded-[var(--radius-lg)] text-[var(--c-on-accent)] font-semibold press"
          style={{ background: 'var(--grad-accent)', boxShadow: 'var(--shadow-accent)' }}
        >
          Reload Ward
        </button>
      </div>
    );
  }
}
