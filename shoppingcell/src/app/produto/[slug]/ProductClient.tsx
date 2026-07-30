'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatBRLFromCents } from '@/lib/formatPrice';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { CheckCircle2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

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
  const [toast, setToast] = useState(false);

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

    setToast(true);
    window.setTimeout(() => setToast(false), 4000);
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
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={add}
          className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-yellow-300 active:scale-95"
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

      {toast && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-400/40 bg-neutral-950/95 p-4 shadow-[0_10px_30px_rgba(250,204,21,0.2)] animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-xs font-black text-white">Item adicionado com sucesso! 🛒</div>
              <div className="text-xs text-slate-300 font-semibold">{product.name}</div>
            </div>
          </div>

          <Link
            href="/catalogo"
            className="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-black text-slate-950 hover:bg-amber-300"
          >
            Ver Catálogo / Carrinho
          </Link>
        </div>
      )}
    </div>
  );
}
