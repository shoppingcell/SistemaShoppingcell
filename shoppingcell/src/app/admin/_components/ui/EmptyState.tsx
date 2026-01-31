import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center px-6 py-16 text-center">
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      {description && <div className="mt-2 text-sm text-slate-400">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
