import type { ReactNode } from 'react';

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={
        'relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 shadow-[0_10px_40px_rgba(0,0,0,0.35)] ' +
        className
      }
    >
      <div className="pointer-events-none absolute -top-24 left-10 h-48 w-48 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-10 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
      {children}
    </div>
  );
}
