'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { Input } from '@/app/admin/_components/ui/Input';
import { Select } from '@/app/admin/_components/ui/Select';
import { Button } from '@/app/admin/_components/ui/Button';

type Product = {
  id: string;
  name: string;
  sheet_code?: string | null;
  price?: number | null;
  cost_price?: number | null;
};

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
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

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string>('');

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

    supabase
      .from('customers')
      .select('id,name,phone')
      .eq('active', true)
      .order('name', { ascending: true })
      .limit(200)
      .then(({ data, error }) => {
        if (error) {
          // If table isn't created yet, we don't block order creation.
          return;
        }
        setCustomers((data as any) ?? []);
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
    const totalValue = items.reduce((acc, i) => acc + Number(i.product.price ?? 0) * i.quantity, 0);
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
      .insert({
        status: 'draft',
        customer_id: customerId || null,
        customer_name: customerName || null,
        customer_phone: phone || null,
        notes: notes || null,
      } as any)
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
      <PageHeader
        kicker="Pedidos"
        title="Novo pedido"
        subtitle="Monte os itens e depois envie pelo WhatsApp."
        actions={
          <Link href="/admin/pedidos" className="text-sm font-semibold text-slate-200 hover:text-white">
            ← Voltar
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-sm font-semibold text-slate-200">Adicionar produtos</div>
            <div className="mt-3">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome ou código…"
              />
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="grid gap-2">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p)}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-slate-100">{p.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {p.sheet_code ? `Código: ${p.sheet_code}` : '—'}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-slate-200">{money(p.price ?? null)}</div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-sm text-slate-400">Nenhum produto encontrado.</div>
              )}
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-sm font-semibold text-slate-200">Cliente</div>
            <div className="mt-1 text-xs text-slate-500">Selecione ou preencha manualmente.</div>
          </div>

          <div className="px-6 py-5 grid gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cliente cadastrado
              </div>
              <div className="mt-2">
                <Select
                  value={customerId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setCustomerId(id);
                    const c = customers.find((x) => x.id === id);
                    if (c) {
                      setCustomerName(c.name);
                      setCustomerPhone(c.phone || '');
                    }
                  }}
                >
                  <option value="">— Selecionar —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</div>
              <div className="mt-2">
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">WhatsApp</div>
              <div className="mt-2">
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="ex: 5594999999999"
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">Só números (com DDI/DDD) se possível.</div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observações</div>
              <div className="mt-2">
                <textarea
                  className="min-h-[90px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-200">Itens do pedido</div>
              <div className="mt-1 text-xs text-slate-500">
                Total itens: {totals.totalItems} • Total: {money(totals.totalValue)}
              </div>
            </div>
            <Button disabled={saving} onClick={saveDraft}>
              Salvar rascunho
            </Button>
          </div>
        </div>

        <div className="px-6 py-5">
          {items.length === 0 ? (
            <div className="text-sm text-slate-400">Nenhum item adicionado ainda.</div>
          ) : (
            <div className="grid gap-2">
              {items.map((it) => (
                <div
                  key={it.product.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-slate-100">{it.product.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {it.product.sheet_code ? `Código: ${it.product.sheet_code}` : '—'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-xs font-semibold text-slate-300">
                      {money(it.product.price ?? null)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-white/10 bg-slate-950 px-3 py-2 text-xs font-extrabold text-slate-100 hover:bg-white/5"
                        onClick={() =>
                          setItems((curr) =>
                            curr.map((x) =>
                              x.product.id === it.product.id
                                ? { ...x, quantity: Math.max(1, x.quantity - 1) }
                                : x,
                            ),
                          )
                        }
                      >
                        −
                      </button>
                      <div className="w-10 text-center text-sm font-extrabold text-slate-100">
                        {it.quantity}
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-white/10 bg-slate-950 px-3 py-2 text-xs font-extrabold text-slate-100 hover:bg-white/5"
                        onClick={() =>
                          setItems((curr) =>
                            curr.map((x) =>
                              x.product.id === it.product.id ? { ...x, quantity: x.quantity + 1 } : x,
                            ),
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="rounded-full bg-red-950/30 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-950/50"
                      onClick={() => setItems((curr) => curr.filter((x) => x.product.id !== it.product.id))}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <div className="mt-4 text-sm text-red-200">{error}</div>}
        </div>
      </Panel>
    </div>
  );
}
