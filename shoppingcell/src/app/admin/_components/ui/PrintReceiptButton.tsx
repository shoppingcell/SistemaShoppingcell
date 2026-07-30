'use client';

import { Printer } from 'lucide-react';

export function PrintReceiptButton({ label = 'Imprimir' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-md transition hover:bg-yellow-300 active:scale-95"
    >
      <Printer size={15} />
      <span>{label}</span>
    </button>
  );
}
