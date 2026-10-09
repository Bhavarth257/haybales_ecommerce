import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`reveal rounded-card border border-line bg-surface p-4 sm:p-5 ${className}`}>{children}</div>;
}
