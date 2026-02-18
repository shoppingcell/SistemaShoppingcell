'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { Input } from '@/app/admin/_components/ui/Input';
// (Select removed: replaced by searchable customer combobox)
import { Button } from '@/app/admin/_components/ui/Button';
import { CreateCustomerModal } from '@/app/admin/pedidos/novo/CreateCustomerModal';

type Product = {
  id: string;
  name: string;
  sheet_code?: string | null;
  price?: number | null;
  cost_price?: number | null;
  product_media?: { url: string; is_primary: boolean; sort: number }[] | null;
  inventory?: { quantity: number; min_quantity: number } | null;
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

function toPublicMediaUrl(raw: string | null | undefined) {
  const u = (raw || '').trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.includes('/storage/v1/object/')) return u;

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  if (!base) return u;

  const path = u.replace(/^\//, '');
  return `${base}/storage/v1/object/public/${path}`;
}

export default function NovoPedidoPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [resultQty, setResultQty] = useState<Record<string, number>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string>('');

  // Customer search (combobox)
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Customers list (kept local for fast selection)
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

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      return;
    }

    const t = setTimeout(() => {
      setLoadingProducts(true);
      setError(null);
      // Autocomplete: search by name OR code
      supabase
        .from('products')
        .select(
          'id,name,sheet_code,price,cost_price,product_media(url,is_primary,sort),inventory(quantity,min_quantity)',
        )
        .eq('active', true)
        .or(`name.ilike.%${term}%,sheet_code.ilike.%${term}%`)
        .order('name', { ascending: true })
        .limit(30)
        .then(({ data, error }) => {
          if (error) setError(error.message);
          const list = ((data as any) ?? []) as Product[];
          setProducts(list);
          // seed qty defaults for new results
          setResultQty((curr) => {
            const next = { ...curr };
            for (const p of list) {
              if (!next[p.id]) next[p.id] = 1;
            }
            return next;
          });
          setLoadingProducts(false);
        });
    }, 300);

    return () => {
      clearTimeout(t);
      setLoadingProducts(false);
    };
  }, [q]);

  const filtered = useMemo(() => products, [products]);

  const filteredCustomers = useMemo(() => {
    const term = customerQuery.trim();
    if (!term) return customers.slice(0, 50);
    const t = term.toLowerCase();
    const digits = onlyDigits(term);

    const res = customers.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const phone = onlyDigits(c.phone || '');
      if (name.includes(t)) return true;
      if (digits && phone.includes(digits)) return true;
      return false;
    });

    return res.slice(0, 50);
  }, [customers, customerQuery]);

  const totals = useMemo(() => {
    const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
    const totalValue = items.reduce((acc, i) => acc + Number(i.product.price ?? 0) * i.quantity, 0);
    return { totalItems, totalValue };
  }, [items]);

  function addProduct(p: Product, qty: number) {
    const requested = Math.max(1, Number(qty) || 1);
    const available = p.inventory?.quantity;
    const add = available == null ? requested : Math.max(0, Math.min(requested, available));

    if (available != null && available <= 0) {
      setError(`Sem estoque para: ${p.name}`);
      requestAnimationFrame(() => searchInputRef.current?.focus());
      return;
    }

    if (available != null && add < requested) {
      setError(`Quantidade ajustada para o máximo disponível (${available}) em: ${p.name}`);
    }

    setItems((curr) => {
      const found = curr.find((i) => i.product.id === p.id);
      if (found) {
        const nextQty = available == null ? found.quantity + add : Math.min(found.quantity + add, available);
        return curr.map((i) => (i.product.id === p.id ? { ...i, quantity: nextQty } : i));
      }
      return [...curr, { product: p, quantity: add }];
    });

    // keep search active for fast PDV flow
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  async function createOrderDraft() {
    setSaving(true);
    setError(null);

    if (items.length === 0) {
      setError('Adicione pelo menos 1 item.');
      setSaving(false);
      return null;
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
      return null;
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
      return null;
    }

    setSaving(false);
    return order.id as string;
  }

  async function saveDraft() {
    const id = await createOrderDraft();
    if (!id) return;
    router.push(`/admin/pedidos/${id}`);
    router.refresh();
  }

  async function saveAndConfirm() {
    const id = await createOrderDraft();
    if (!id) return;
    const res = await fetch(`/api/admin/orders/${id}/confirm`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setError(json?.error || 'Falha ao confirmar (baixar estoque).');
      return;
    }
    router.push(`/admin/pedidos/${id}`);
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
                ref={searchInputRef as any}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome, código ou descrição… (mín. 2 letras)"
              />
              <div className="mt-2 text-xs text-slate-500">
                Dica: digite 2+ letras. Não exibimos a lista inteira para ficar mais rápido.
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="grid gap-2">
              {loadingProducts && <div className="text-sm text-slate-400">Buscando produtos…</div>}
              {!loadingProducts && q.trim().length < 2 && (
                <div className="text-sm text-slate-400">Comece digitando para buscar produtos.</div>
              )}
              {!loadingProducts &&
                q.trim().length >= 2 &&
                filtered.map((p) => {
                  const media = (p.product_media || []).slice().sort((a, b) => {
                    // primary first, then sort
                    if (a.is_primary && !b.is_primary) return -1;
                    if (!a.is_primary && b.is_primary) return 1;
                    return (a.sort ?? 0) - (b.sort ?? 0);
                  });
                  const thumb = toPublicMediaUrl(media[0]?.url);
                  const qty = resultQty[p.id] ?? 1;
                  const stock = p.inventory?.quantity;
                  const minQ = p.inventory?.min_quantity;
                  const stockLabel =
                    stock == null
                      ? 'Estoque: —'
                      : minQ != null && stock <= minQ
                        ? `Estoque baixo: ${stock}`
                        : `Estoque: ${stock}`;
                  const stockTone =
                    stock == null
                      ? 'text-slate-500'
                      : minQ != null && stock <= minQ
                        ? 'text-amber-300'
                        : 'text-slate-500';

                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                    >
                      <div className="h-12 w-12 flex-none overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-600">
                            —
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-extrabold text-slate-100">{p.name}</div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          <div className="text-slate-500">
                            {p.sheet_code ? `Código: ${p.sheet_code}` : '—'}
                          </div>
                          <div className={stockTone}>{stockLabel}</div>
                        </div>
                      </div>

                      <div className="flex flex-none items-center gap-2">
                        <div className="hidden text-xs font-semibold text-slate-200 sm:block">
                          {money(p.price ?? null)}
                        </div>

                        <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-slate-950/30 p-1">
                          <button
                            type="button"
                            className="rounded-xl px-3 py-2 text-xs font-extrabold text-slate-100 hover:bg-white/5"
                            onClick={() =>
                              setResultQty((curr) => ({
                                ...curr,
                                [p.id]: Math.max(1, (curr[p.id] ?? 1) - 1),
                              }))
                            }
                          >
                            −
                          </button>
                          <div className="w-8 text-center text-sm font-extrabold text-slate-100">{qty}</div>
                          <button
                            type="button"
                            className="rounded-xl px-3 py-2 text-xs font-extrabold text-slate-100 hover:bg-white/5"
                            onClick={() =>
                              setResultQty((curr) => {
                                const max = p.inventory?.quantity;
                                const next = (curr[p.id] ?? 1) + 1;
                                return {
                                  ...curr,
                                  [p.id]: max == null ? next : Math.min(next, Math.max(1, max)),
                                };
                              })
                            }
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => addProduct(p, qty)}
                          disabled={(p.inventory?.quantity ?? 1) <= 0}
                          className={`rounded-2xl px-4 py-3 text-xs font-extrabold ${
                            (p.inventory?.quantity ?? 1) <= 0
                              ? 'bg-slate-700 text-slate-300'
                              : 'bg-yellow-400 text-slate-950 hover:bg-yellow-300'
                          }`}
                        >
                          {(p.inventory?.quantity ?? 1) <= 0 ? 'Sem estoque' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              {!loadingProducts && q.trim().length >= 2 && filtered.length === 0 && (
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
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cliente cadastrado
                </div>
                <button
                  type="button"
                  className="text-xs font-extrabold text-yellow-300 hover:text-yellow-200"
                  onClick={() => setCreateCustomerOpen(true)}
                >
                  + Novo cliente
                </button>
              </div>
              <div className="mt-2 relative">
                <Input
                  value={customerQuery}
                  onChange={(e) => {
                    setCustomerQuery(e.target.value);
                    setCustomerOpen(true);
                  }}
                  onFocus={() => setCustomerOpen(true)}
                  onBlur={() => {
                    // let click events on the list run before closing
                    setTimeout(() => setCustomerOpen(false), 150);
                  }}
                  placeholder="Buscar cliente por nome ou WhatsApp…"
                />

                {customerOpen && filteredCustomers.length > 0 && (
                  <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-white/10 bg-slate-950 shadow-xl">
                    {filteredCustomers.map((c) => {
                      const phone = onlyDigits(c.phone || '');
                      const label = phone ? `${c.name} • ${phone}` : c.name;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-slate-100 hover:bg-white/5"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setCustomerId(c.id);
                            setCustomerName(c.name);
                            setCustomerPhone(phone);
                            setCustomerQuery(label);
                            setCustomerOpen(false);
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-extrabold">{c.name}</div>
                            <div className="mt-0.5 truncate text-xs text-slate-400">{phone || '—'}</div>
                          </div>
                          <div className="text-xs font-semibold text-slate-400">Selecionar</div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {customerId && (
                  <div className="mt-2 text-xs text-slate-400">
                    Selecionado: <span className="font-semibold text-slate-200">{customerName || '—'}</span>
                    {customerPhone ? (
                      <span className="text-slate-400"> • {onlyDigits(customerPhone)}</span>
                    ) : null}
                  </div>
                )}
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button disabled={saving} onClick={saveDraft}>
                Salvar rascunho
              </Button>
              <Button variant="primary" disabled={saving} onClick={saveAndConfirm}>
                Finalizar (confirmar + baixar estoque)
              </Button>
            </div>
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
                            curr.map((x) => {
                              if (x.product.id !== it.product.id) return x;
                              const max = x.product.inventory?.quantity;
                              const next = x.quantity + 1;
                              if (max != null && next > max) {
                                setError(
                                  `Quantidade ajustada para o máximo disponível (${max}) em: ${x.product.name}`,
                                );
                              }
                              return {
                                ...x,
                                quantity: max == null ? next : Math.min(next, Math.max(1, max)),
                              };
                            }),
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

      <CreateCustomerModal
        open={createCustomerOpen}
        onClose={() => setCreateCustomerOpen(false)}
        initialName={customerName}
        initialPhone={customerPhone}
        onCreated={(c) => {
          setCustomers((curr) => [c as any, ...curr].sort((a, b) => a.name.localeCompare(b.name)));
          setCustomerId(c.id);
          setCustomerName(c.name);
          setCustomerPhone(c.phone || '');
          const phone = onlyDigits(c.phone || '');
          setCustomerQuery(phone ? `${c.name} • ${phone}` : c.name);
        }}
      />
    </div>
  );
}
