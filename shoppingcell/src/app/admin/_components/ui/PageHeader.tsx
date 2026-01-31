import type { ReactNode } from 'react';

export function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
      <div>
        {kicker && (
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kicker}</div>
        )}
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-3">{actions}</div>}
    </div>
  );
}
