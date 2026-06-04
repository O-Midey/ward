// ============================================================
// Ward — Card
// ============================================================

import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({ elevated, className = '', ...props }: CardProps) {
  return <div className={`${elevated ? 'card-elevated' : 'card'} ${className}`} {...props} />;
}
