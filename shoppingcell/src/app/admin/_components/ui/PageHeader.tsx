import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
  backHref,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
      <div>
        {kicker && (
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kicker}</div>
        )}

        {backHref && (
          <div className="mt-1">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
            >
              <span aria-hidden>←</span>
              Voltar
            </Link>
          </div>
        )}

        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-3">{actions}</div>}
    </div>
  );
}
