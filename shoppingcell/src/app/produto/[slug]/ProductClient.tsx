'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatBRLFromCents } from '@/lib/formatPrice';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

type Product = {
  id: string;
  name: string;
  slug: string;
  base_price_cents: number;
};

type CartItem = { id: string; name: string; slug: string; price_cents: number; qty: number };

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

export default function ProductClient({ product, whatsappE164 }: { product: Product; whatsappE164: string }) {
  const [cart, setCart] = useState<CartItem[]>(() => (typeof window === 'undefined' ? [] : loadCart()));

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const totalCents = useMemo(() => cart.reduce((a, i) => a + i.price_cents * i.qty, 0), [cart]);

  function add() {
    setCart((prev) => {
      const next = [...prev];
      const idx = next.findIndex((x) => x.id === product.id);
      if (idx >= 0) next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
      else
        next.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price_cents: product.base_price_cents,
          qty: 1,
        });
      return next;
    });
  }

  const waMessage = useMemo(() => {
    if (cart.length === 0) {
      return `Olá! Tenho interesse no produto: ${product.name} (ShoppingCell).`;
    }
    const lines = cart.map((i) => `• ${i.qty}x ${i.name} — ${formatBRLFromCents(i.price_cents * i.qty)}`);
    lines.push(`Total: ${formatBRLFromCents(totalCents)}`);
    lines.push('');
    lines.push('Quero finalizar esse pedido.');
    return lines.join('\n');
  }, [cart, product.name, totalCents]);

  const waUrl = useMemo(() => buildWhatsAppUrl(whatsappE164, waMessage), [whatsappE164, waMessage]);

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        onClick={add}
        className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-yellow-300"
      >
        Adicionar ao carrinho
      </button>
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-emerald-400"
      >
        Finalizar no WhatsApp
      </a>
    </div>
  );
}
