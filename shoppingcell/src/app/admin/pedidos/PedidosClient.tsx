'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { PaymentBadge, StatusBadge } from '@/app/admin/pedidos/OrderBadges';

type OrderRow = {
  id: string;
  status: string;
  payment_status?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customers?: { name?: string | null; phone?: string | null } | null;
  created_at: string;
};

type StatusFilter = 'all' | 'draft' | 'sent' | 'confirmed';
type PaymentFilter = 'all' | 'pending' | 'paid';

export function PedidosClient({ orders }: { orders: OrderRow[] }) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return orders.filter((o) => {
      const status = (o.status || '').toLowerCase();
      const payment = ((o.payment_status ?? 'pending') || 'pending').toLowerCase();
      const customerName = ((o.customers?.name ?? o.customer_name ?? '') as string).toLowerCase();
      const customerPhone = ((o.customers?.phone ?? o.customer_phone ?? '') as string).toLowerCase();

      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (paymentFilter !== 'all' && payment !== paymentFilter) return false;

      if (!term) return true;

      return [customerName, customerPhone, status, payment, String(o.id)].some((value) => value.includes(term));
    });
  }, [orders, q, statusFilter, paymentFilter]);

  return (
    <Panel>
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-200">Últimos pedidos</div>
            <div className="mt-1 text-xs text-slate-400">
              {filtered.length} de {orders.length} exibidos
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por cliente, telefone ou status…"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-yellow-500/40 focus:outline-none xl:w-80"
            />

            <div className="flex flex-wrap gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={
                    'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                    (statusFilter === 'all'
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                  }
                >
                  Todos
                </button>
                <button
                  onClick={() => setStatusFilter('draft')}
                  className={
                    'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                    (statusFilter === 'draft'
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                  }
                >
                  Rascunho
                </button>
                <button
                  onClick={() => setStatusFilter('sent')}
                  className={
                    'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                    (statusFilter === 'sent'
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                  }
                >
                  Enviado
                </button>
                <button
                  onClick={() => setStatusFilter('confirmed')}
                  className={
                    'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                    (statusFilter === 'confirmed'
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                  }
                >
                  Confirmado
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPaymentFilter('all')}
                  className={
                    'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                    (paymentFilter === 'all'
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                  }
                >
                  Pagamento
                </button>
                <button
                  onClick={() => setPaymentFilter('pending')}
                  className={
                    'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                    (paymentFilter === 'pending'
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                  }
                >
                  Pendente
                </button>
                <button
                  onClick={() => setPaymentFilter('paid')}
                  className={
                    'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                    (paymentFilter === 'paid'
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                  }
                >
                  Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr className="border-b border-white/10">
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Pagamento</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">WhatsApp</th>
              <th className="px-6 py-4">Criado</th>
              <th className="px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-6 py-4">
                  <StatusBadge status={o.status as any} />
                </td>
                <td className="px-6 py-4">
                  <PaymentBadge status={(o.payment_status ?? 'pending') as any} />
                </td>
                <td className="px-6 py-4 font-semibold text-slate-100">
                  {(o.customers?.name ?? o.customer_name ?? '—') as string}
                </td>
                <td className="px-6 py-4 text-slate-300">{(o.customers?.phone ?? o.customer_phone ?? '—') as string}</td>
                <td className="px-6 py-4 text-slate-400">{new Date(o.created_at).toLocaleString('pt-BR')}</td>
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/pedidos/${o.id}`}
                    className="font-semibold text-yellow-300 hover:text-yellow-200"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-6 py-10 text-slate-400" colSpan={6}>
                  Nenhum pedido encontrado com estes filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
