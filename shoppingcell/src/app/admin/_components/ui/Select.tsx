import type { SelectHTMLAttributes } from 'react';

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={
        'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 ' +
        (props.className || '')
      }
    />
  );
}
