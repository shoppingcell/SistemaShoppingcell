import React from 'react';

type KpiCardProps = {
  title: string;
  value: string | number;
  delta?: string | number;
  subtitle?: string;
};

export default function KpiCard({ title, value, delta, subtitle }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">{title}</div>
          <div className="mt-1 text-2xl font-extrabold text-white">{value}</div>
        </div>
        {delta ? (
          <div className="ml-4 rounded-md bg-slate-800/30 px-3 py-1 text-sm text-green-300">{delta}</div>
        ) : null}
      </div>
      {subtitle ? <div className="mt-2 text-xs text-slate-400">{subtitle}</div> : null}
    </div>
  );
}
