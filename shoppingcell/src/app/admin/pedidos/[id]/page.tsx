'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { Button } from '@/app/admin/_components/ui/Button';
import { Modal } from '@/app/admin/_components/ui/Modal';
import { Input } from '@/app/admin/_components/ui/Input';
import { PaymentBadge, StatusBadge } from '@/app/admin/pedidos/OrderBadges';
import { buildWhatsAppUrl } from '@/app/admin/pedidos/WhatsApp';

function money(n: number | null | undefined) {
  if (n == null) return '—';
  return `R$ ${Number(n).toFixed(2)}`;
}

export default function PedidoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const [modal, setModal] = useState<null | 'payment'>(null);
  const [saving, setSaving] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [paidCategory, setPaidCategory] = useState('Vendas');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao'>('pix');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [{ data: o, error: oErr }, { data: its, error: iErr }] = await Promise.all([
      supabase.from('orders').select('*').eq('id', id).single(),
      supabase.from('order_items').select('*').eq('order_id', id),
    ]);

    if (oErr) {
      setError(oErr.message);
      setLoading(false);
      return;
    }

    if (iErr) {
      setError(iErr.message);
      setLoading(false);
      return;
    }

    const ids = ((its as any[]) ?? []).map((x: any) => x.product_id).filter(Boolean);
    const { data: prods } = ids.length
      ? await supabase.from('products').select('id,name,sheet_code').in('id', ids)
      : { data: [] as any[] };

    const nameById = new Map((prods ?? []).map((p: any) => [p.id, p]));
    setOrder(o);
    setItems(((its as any[]) ?? []).map((it: any) => ({ ...it, product: nameById.get(it.product_id) })));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const total = useMemo(
    () => items.reduce((acc, it) => acc + Number(it.price ?? 0) * Number(it.quantity ?? 0), 0),
    [items],
  );

  function buildWhatsAppText() {
    const lines: string[] = [];
    lines.push('Pedido (ShoppingCell)');
    lines.push(`ID: ${id}`);
    if (order?.customer_name) lines.push(`Cliente: ${order.customer_name}`);
    lines.push('');
    lines.push('Itens:');
    for (const it of items) {
      const name = it.product?.name ?? it.product_id;
      const code = it.product?.sheet_code ? ` (${it.product.sheet_code})` : '';
      const qty = it.quantity;
      const price = it.price != null ? ` - ${money(it.price)}` : '';
      lines.push(`- ${qty}x ${name}${code}${price}`);
    }
    lines.push('');
    lines.push(`Total: ${money(total)}`);
    if (order?.notes) {
      lines.push('');
      lines.push(`Obs: ${order.notes}`);
    }
    return lines.join('\n');
  }

  async function sendWhatsApp() {
    setError(null);
    const to = process.env.NEXT_PUBLIC_WHATSAPP_E164 || '';
    if (!to) {
      setError('NEXT_PUBLIC_WHATSAPP_E164 não configurado.');
      return;
    }

    const text = buildWhatsAppText();
    const url = buildWhatsAppUrl(to, text);
    window.open(url, '_blank', 'noopener,noreferrer');

    await supabase.from('orders').update({ status: 'sent' }).eq('id', id);
    router.refresh();
  }

  async function confirmOrder() {
    setError(null);
    const res = await fetch(`/api/admin/orders/${id}/confirm`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setError(json?.error || 'Falha ao confirmar.');
      return;
    }
    router.refresh();
    // reload view state
    window.location.reload();
  }

  async function setPaymentStatus(status: 'paid' | 'pending') {
    setSaving(true);
    setError(null);

    const { error: upErr } = await supabase
      .from('orders')
      .update({ payment_status: status } as any)
      .eq('id', id);
    if (upErr) {
      setError(upErr.message + ' (rode supabase/admin_patch_orders_payment.sql)');
      setSaving(false);
      return;
    }

    router.refresh();
    window.location.reload();
  }

  async function markAsPaidAndRegister() {
    setSaving(true);
    setError(null);

    if (!paymentMethod) {
      setError('Selecione a forma de pagamento (PIX, Dinheiro ou Cartão).');
      setSaving(false);
      return;
    }

    const amt = paidAmount.trim() ? Number(paidAmount.replace(',', '.')) : total;

    const { error: txErr } = await supabase.from('finance_transactions').insert({
      type: 'income',
      payment_method: paymentMethod,
      category: paidCategory.trim() || 'Vendas',
      description: `Pedido ${String(id).slice(0, 8)} (pago)` + ` [${paymentMethod.toUpperCase()}]`,
      amount: amt,
      occurred_at: new Date().toISOString(),
      order_id: id,
    } as any);

    if (txErr) {
      setError(txErr.message);
      setSaving(false);
      return;
    }

    const { error: upErr } = await supabase
      .from('orders')
      .update({ payment_status: 'paid' } as any)
      .eq('id', id);
    if (upErr) {
      setError(upErr.message + ' (rode supabase/admin_patch_orders_payment.sql)');
      setSaving(false);
      return;
    }

    setModal(null);
    router.refresh();
    window.location.reload();
  }

  if (loading) return <div className="text-slate-300">Carregando…</div>;
  if (error) return <div className="text-red-200">Erro: {error}</div>;

  const paymentStatus = (order as any)?.payment_status ?? 'pending';

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Pedidos"
        title="Pedido"
        subtitle={`ID: ${String(id).slice(0, 8)}`}
        actions={
          <Link href="/admin/pedidos" className="text-sm font-semibold text-slate-200 hover:text-white">
            ← Voltar
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={order?.status} />
                <PaymentBadge status={paymentStatus} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={sendWhatsApp}>
                  Enviar no WhatsApp
                </Button>
                <Button variant="primary" onClick={confirmOrder}>
                  Confirmar (baixar estoque)
                </Button>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="grid gap-2">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-slate-100">
                      {it.product?.name ?? it.product_id}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {it.product?.sheet_code ? `Código: ${it.product.sheet_code}` : '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-slate-100">{it.quantity}x</div>
                    <div className="mt-1 text-xs text-slate-400">{money(it.price)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-400">Total</div>
              <div className="text-xl font-extrabold text-yellow-400">{money(total)}</div>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-sm font-semibold text-slate-200">Cliente</div>
          </div>
          <div className="px-6 py-5">
            <div className="text-lg font-extrabold text-slate-100">
              {order?.customers?.name ?? order?.customer_name ?? '—'}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              {order?.customers?.phone ?? order?.customer_phone ?? '—'}
            </div>

            <div className="mt-4 grid gap-2">
              <Button variant="success" disabled={saving} onClick={() => setModal('payment')}>
                Marcar como pago
              </Button>
              <Button variant="ghost" disabled={saving} onClick={() => void setPaymentStatus('pending')}>
                Marcar como pendente
              </Button>
            </div>

            {error && <div className="mt-4 text-sm text-red-200">{error}</div>}
          </div>
        </Panel>
      </div>

      <Modal open={modal === 'payment'} title="Confirmar pagamento" onClose={() => setModal(null)}>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void markAsPaidAndRegister();
          }}
        >
          <div className="text-sm text-slate-300">
            Vai registrar uma entrada no Financeiro e marcar o pedido como{' '}
            <span className="font-semibold">Pago</span>.
          </div>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Forma de pagamento
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className={`rounded-2xl border px-4 py-3 text-xs font-extrabold ${
                paymentMethod === 'pix'
                  ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-200'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
              onClick={() => setPaymentMethod('pix')}
            >
              PIX
            </button>
            <button
              type="button"
              className={`rounded-2xl border px-4 py-3 text-xs font-extrabold ${
                paymentMethod === 'dinheiro'
                  ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-200'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
              onClick={() => setPaymentMethod('dinheiro')}
            >
              Dinheiro
            </button>
            <button
              type="button"
              className={`rounded-2xl border px-4 py-3 text-xs font-extrabold ${
                paymentMethod === 'cartao'
                  ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-200'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
              onClick={() => setPaymentMethod('cartao')}
            >
              Cartão
            </button>
          </div>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Valor (opcional)
          </label>
          <Input
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            placeholder={String(total)}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria</label>
          <Input
            value={paidCategory}
            onChange={(e) => setPaidCategory(e.target.value)}
            placeholder="Vendas"
          />

          {error && <div className="text-sm text-red-200">{error}</div>}

          <Button disabled={saving} type="submit">
            Confirmar pagamento
          </Button>
        </form>
      </Modal>
    </div>
  );
}
