'use client';

// ============================================================
// Ward — App Providers
// ============================================================
// Composite provider — error boundary, reduced-motion config,
// theme, and query.

import { MotionConfig } from 'framer-motion';
import { QueryProvider } from './QueryProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      {/* `reducedMotion="user"` makes every Framer animation respect the OS
          prefers-reduced-motion setting (CSS transitions are handled in
          globals.css). */}
      <MotionConfig reducedMotion="user">
        <QueryProvider>{children}</QueryProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
