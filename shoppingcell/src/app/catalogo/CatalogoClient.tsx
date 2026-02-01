'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatBRLFromCents } from '@/lib/formatPrice';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price_cents: number;
  featured: boolean;
  imageUrl: string | null;
};

type CartItem = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  qty: number;
};

const LS_KEY = 'shoppingcell_cart_v1';

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

export default function CatalogoClient({
  products,
  whatsappE164,
}: {
  products: Product[];
  whatsappE164: string;
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => (typeof window === 'undefined' ? [] : loadCart()));

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const featured = useMemo(() => products.filter((p) => p.featured), [products]);
  const regular = useMemo(() => products.filter((p) => !p.featured), [products]);

  const totalCents = useMemo(() => cart.reduce((a, i) => a + i.price_cents * i.qty, 0), [cart]);
  const totalQty = useMemo(() => cart.reduce((a, i) => a + i.qty, 0), [cart]);

  function addToCart(p: Product) {
    setCart((prev) => {
      const next = [...prev];
      const idx = next.findIndex((x) => x.id === p.id);
      if (idx >= 0) next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
      else next.push({ id: p.id, name: p.name, slug: p.slug, price_cents: p.base_price_cents, qty: 1 });
      return next;
    });
    setCartOpen(true);
  }

  function inc(id: string) {
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
  }

  function dec(id: string) {
    setCart((prev) =>
      prev.flatMap((i) => (i.id === id ? (i.qty <= 1 ? [] : [{ ...i, qty: i.qty - 1 }]) : [i])),
    );
  }

  function clear() {
    setCart([]);
  }

  const waMessage = useMemo(() => {
    if (cart.length === 0) return '';
    const lines = cart.map((i) => `• ${i.qty}x ${i.name} — ${formatBRLFromCents(i.price_cents * i.qty)}`);
    lines.push(`Total: ${formatBRLFromCents(totalCents)}`);
    lines.push('');
    lines.push('Quero finalizar esse pedido.');
    return lines.join('\n');
  }, [cart, totalCents]);

  const waUrl = useMemo(() => buildWhatsAppUrl(whatsappE164, waMessage), [whatsappE164, waMessage]);

  return (
    <>
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="text-sm text-slate-300">{products.length} produtos</div>
        <button
          onClick={() => setCartOpen(true)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
        >
          Carrinho ({totalQty})
        </button>
      </div>

      {featured.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Destaques</h2>
            <div className="text-xs text-slate-400">Selecionados pela loja</div>
          </div>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {featured.map((p) => (
              <div
                key={p.id}
                className="min-w-[260px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950"
              >
                <Link href={`/produto/${p.slug}`} className="block">
                  <div className="aspect-[4/3] bg-slate-900/40">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain p-2" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-500">
                        Sem imagem
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="truncate text-sm font-extrabold">{p.name}</div>
                    <div className="mt-2 text-base font-extrabold text-yellow-400">
                      {formatBRLFromCents(p.base_price_cents)}
                    </div>
                  </div>
                </Link>
                <div className="p-4 pt-0">
                  <button
                    onClick={() => addToCart(p)}
                    className="w-full rounded-xl bg-yellow-400 px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-yellow-300"
                  >
                    Adicionar ao carrinho
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-extrabold">Produtos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {regular.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
              <Link href={`/produto/${p.slug}`} className="block">
                <div className="aspect-[4/3] bg-slate-900/40">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain p-2" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">
                      Sem imagem
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="text-lg font-semibold">{p.name}</div>
                  <div className="mt-2 line-clamp-2 text-sm text-slate-300">{p.description ?? '—'}</div>
                  <div className="mt-4 text-base font-bold text-yellow-400">
                    {formatBRLFromCents(p.base_price_cents)}
                  </div>
                </div>
              </Link>
              <div className="px-5 pb-5">
                <button
                  onClick={() => addToCart(p)}
                  className="w-full rounded-xl bg-yellow-400 px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-yellow-300"
                >
                  Adicionar ao carrinho
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button className="absolute inset-0 bg-black/70" onClick={() => setCartOpen(false)} />
          <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-slate-950 p-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold">Carrinho</div>
              <button
                onClick={() => setCartOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                Fechar
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
                Seu carrinho está vazio.
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-3">
                  {cart.map((i) => (
                    <div
                      key={i.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-100">{i.name}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {formatBRLFromCents(i.price_cents)} • subtotal{' '}
                          {formatBRLFromCents(i.price_cents * i.qty)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => dec(i.id)}
                          className="rounded-full bg-white/10 px-3 py-2 text-sm font-extrabold text-white hover:bg-white/15"
                        >
                          −
                        </button>
                        <div className="w-8 text-center text-sm font-extrabold text-slate-100">{i.qty}</div>
                        <button
                          onClick={() => inc(i.id)}
                          className="rounded-full bg-white/10 px-3 py-2 text-sm font-extrabold text-white hover:bg-white/15"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-slate-300">Total</div>
                  <div className="text-xl font-extrabold text-yellow-400">
                    {formatBRLFromCents(totalCents)}
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-extrabold text-slate-950 hover:bg-emerald-400"
                  >
                    Finalizar no WhatsApp
                  </a>
                  <button
                    onClick={clear}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
                  >
                    Limpar carrinho
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
