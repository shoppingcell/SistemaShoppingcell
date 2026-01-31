'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

type Product = {
  id: string;
  name: string;
  sheet_code?: string | null;
  price?: number | null;
  cost_price?: number | null;
};

type Item = { product: Product; quantity: number };

function onlyDigits(s: string) {
  return (s || '').replace(/\D/g, '');
}

function money(n: number | null | undefined) {
  if (n == null) return '—';
  return `R$ ${Number(n).toFixed(2)}`;
}

export default function NovoPedidoPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('products')
      .select('id,name,sheet_code,price,cost_price')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setProducts((data as any) ?? []);
      });
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products.slice(0, 30);
    return products
      .filter((p) => p.name.toLowerCase().includes(term) || (p.sheet_code || '').toLowerCase().includes(term))
      .slice(0, 30);
  }, [products, q]);

  const totals = useMemo(() => {
    const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
    const totalValue = items.reduce((acc, i) => acc + (Number(i.product.price ?? 0) * i.quantity), 0);
    return { totalItems, totalValue };
  }, [items]);

  function addProduct(p: Product) {
    setItems((curr) => {
      const found = curr.find((i) => i.product.id === p.id);
      if (found) {
        return curr.map((i) => (i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...curr, { product: p, quantity: 1 }];
    });
  }

  async function saveDraft() {
    setSaving(true);
    setError(null);

    if (items.length === 0) {
      setError('Adicione pelo menos 1 item.');
      setSaving(false);
      return;
    }

    const phone = onlyDigits(customerPhone);

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({ status: 'draft', customer_name: customerName || null, customer_phone: phone || null, notes: notes || null })
      .select('id')
      .single();

    if (orderErr) {
      setError(orderErr.message);
      setSaving(false);
      return;
    }

    const payload = items.map((i) => ({
      order_id: order.id,
      product_id: i.product.id,
      quantity: i.quantity,
      price: i.product.price ?? null,
      cost_price: i.product.cost_price ?? null,
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(payload as any);
    if (itemsErr) {
      setError(itemsErr.message);
      setSaving(false);
      return;
    }

    router.push(`/admin/pedidos/${order.id}`);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Novo pedido</h1>
        <p className="mt-1 text-sm text-slate-400">Monte os itens e depois envie pelo WhatsApp.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 md:col-span-2">
          <div className="text-sm font-semibold">Adicionar produtos</div>
          <input
            className="mt-3 w-full rounded-md bg-slate-900 p-3 text-white"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou código..."
          />

          <div className="mt-4 grid gap-2">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProduct(p)}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/30 p-3 text-left hover:bg-slate-900/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-200">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.sheet_code ? `Código: ${p.sheet_code}` : '—'}</div>
                </div>
                <div className="text-xs text-slate-300">{money(p.price ?? null)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="text-sm font-semibold">Cliente</div>
          <div className="mt-3 grid gap-3">
            <label className="text-sm text-slate-200">
              Nome
              <input className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </label>
            <label className="text-sm text-slate-200">
              WhatsApp
              <input
                className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="ex: 5594999999999"
              />
              <div className="mt-1 text-xs text-slate-500">Só números (com DDI/DDD) se possível.</div>
            </label>
            <label className="text-sm text-slate-200">
              Observações
              <textarea className="mt-1 min-h-[80px] w-full rounded-md bg-slate-900 p-3 text-white" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm font-semibold">Itens do pedido</div>
            <div className="mt-1 text-xs text-slate-500">
              Total itens: {totals.totalItems} • Total: {money(totals.totalValue)}
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-4 text-sm text-slate-500">Nenhum item adicionado ainda.</div>
        ) : (
          <div className="mt-4 grid gap-2">
            {items.map((it) => (
              <div key={it.product.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-200">{it.product.name}</div>
                  <div className="text-xs text-slate-500">{it.product.sheet_code ? `Código: ${it.product.sheet_code}` : '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                    onClick={() => setItems((curr) => curr.map((x) => (x.product.id === it.product.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))}
                  >
                    -
                  </button>
                  <div className="w-10 text-center text-sm text-slate-200">{it.quantity}</div>
                  <button
                    type="button"
                    className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                    onClick={() => setItems((curr) => curr.map((x) => (x.product.id === it.product.id ? { ...x, quantity: x.quantity + 1 } : x)))}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="ml-2 rounded-md bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-950/50"
                    onClick={() => setItems((curr) => curr.filter((x) => x.product.id !== it.product.id))}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <div className="text-sm text-red-200">{error ?? ''}</div>
          <button
            disabled={saving}
            onClick={saveDraft}
            className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
          >
            Salvar rascunho
          </button>
        </div>
      </div>
    </div>
  );
}
