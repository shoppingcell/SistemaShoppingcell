'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

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

  async function load() {
    setLoading(true);
    setError(null);

    const [{ data: o, error: oErr }, { data: its, error: iErr }, { data: prods }] = await Promise.all([
      supabase.from('orders').select('*').eq('id', id).single(),
      supabase.from('order_items').select('*').eq('order_id', id),
      supabase.from('products').select('id,name,sheet_code').in(
        'id',
        (items ?? []).map((x) => x.product_id),
      ),
    ]);

    if (oErr) setError(oErr.message);
    if (iErr) setError(iErr.message);

    const nameById = new Map((prods ?? []).map((p: any) => [p.id, p]));
    setOrder(o);
    setItems((its ?? []).map((it: any) => ({ ...it, product: nameById.get(it.product_id) })))
    setLoading(false);
  }

  useEffect(() => {
    // load items first, then products
    (async () => {
      setLoading(true);
      setError(null);
      const { data: o, error: oErr } = await supabase.from('orders').select('*').eq('id', id).single();
      if (oErr) {
        setError(oErr.message);
        setLoading(false);
        return;
      }
      const { data: its, error: iErr } = await supabase.from('order_items').select('*').eq('order_id', id);
      if (iErr) {
        setError(iErr.message);
        setLoading(false);
        return;
      }
      const ids = (its ?? []).map((x: any) => x.product_id);
      const { data: prods } = await supabase.from('products').select('id,name,sheet_code').in('id', ids);
      const byId = new Map((prods ?? []).map((p: any) => [p.id, p]));
      setOrder(o);
      setItems((its ?? []).map((it: any) => ({ ...it, product: byId.get(it.product_id) })));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const total = useMemo(() => items.reduce((acc, it) => acc + Number(it.price ?? 0) * Number(it.quantity ?? 0), 0), [items]);

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
    const to = (process.env.NEXT_PUBLIC_WHATSAPP_E164 || '').replace(/\D/g, '');
    if (!to) {
      setError('NEXT_PUBLIC_WHATSAPP_E164 não configurado.');
      return;
    }

    const text = buildWhatsAppText();
    const url = `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
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

  if (loading) return <div className="text-slate-300">Carregando…</div>;
  if (error) return <div className="text-red-200">Erro: {error}</div>;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-extrabold">Pedido</h1>
          <p className="mt-1 text-sm text-slate-400">Status: {order?.status}</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <button
            onClick={sendWhatsApp}
            className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-500"
          >
            Enviar no WhatsApp
          </button>
          <button
            onClick={confirmOrder}
            className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
          >
            Confirmar (baixar estoque)
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="text-sm text-slate-400">Cliente</div>
        <div className="mt-1 text-lg font-semibold text-slate-200">{order?.customer_name ?? '—'}</div>
        <div className="text-sm text-slate-400">{order?.customer_phone ?? '—'}</div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="text-sm font-semibold">Itens</div>
        <div className="mt-4 grid gap-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/30 p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-200">{it.product?.name ?? it.product_id}</div>
                <div className="text-xs text-slate-500">{it.product?.sheet_code ? `Código: ${it.product.sheet_code}` : '—'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-200">{it.quantity}x</div>
                <div className="text-xs text-slate-400">{money(it.price)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-slate-400">Total</div>
          <div className="font-semibold text-slate-200">{money(total)}</div>
        </div>
      </div>

      {error && <div className="text-red-200">{error}</div>}
    </div>
  );
}
