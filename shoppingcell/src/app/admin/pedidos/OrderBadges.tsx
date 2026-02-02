'use client';

export function StatusBadge({ status }: { status: string }) {
  const base = 'rounded-full px-3 py-1 text-xs font-semibold';
  if (status === 'confirmed')
    return <span className={`${base} bg-green-500/15 text-green-300`}>Confirmado</span>;
  if (status === 'sent') return <span className={`${base} bg-yellow-400/15 text-yellow-200`}>Enviado</span>;
  if (status === 'cancelled') return <span className={`${base} bg-red-500/15 text-red-200`}>Cancelado</span>;
  return <span className={`${base} bg-white/10 text-slate-200`}>{status || '—'}</span>;
}

export function PaymentBadge({ status }: { status: string }) {
  const base = 'rounded-full px-3 py-1 text-xs font-semibold';
  if (status === 'paid') return <span className={`${base} bg-green-500/15 text-green-300`}>Pago</span>;
  if (status === 'pending') return <span className={`${base} bg-white/10 text-slate-200`}>Pendente</span>;
  return <span className={`${base} bg-white/10 text-slate-200`}>{status || '—'}</span>;
}
