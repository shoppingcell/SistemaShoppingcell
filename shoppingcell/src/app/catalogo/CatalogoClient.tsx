'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured: boolean;
  imageUrl: string | null;
  sheet_code?: string | null;
};

export default function CatalogoClient({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('');

  const filteredProducts = useMemo(() => {
    const q = query
      .trim()
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
       
      .replace(/\p{Diacritic}/gu, '');

    if (!q) return products;

    return products.filter((p) => {
      const hay = [p.name, p.description ?? '', p.sheet_code ?? '']
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .normalize('NFD')
         
        .replace(/\p{Diacritic}/gu, '');
      return hay.includes(q);
    });
  }, [products, query]);

  const featured = useMemo(() => filteredProducts.filter((p) => p.featured), [filteredProducts]);
  const regular = useMemo(() => filteredProducts.filter((p) => !p.featured), [filteredProducts]);

  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function qtyFor(id: string) {
    return Math.max(1, Number(qtyById[id] || 1));
  }

  async function quote(p: Product) {
    setError(null);
    setLoadingId(p.id);

    try {
      const qty = qtyFor(p.id);
      const res = await fetch('/api/whatsapp/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              name: p.name,
              code: (p.sheet_code || '').trim() || null,
              qty,
              url: `${window.location.origin}/produto/${p.slug}`,
            },
          ],
          notes: null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok || !json?.waLink) {
        setError(json?.error || 'Falha ao gerar link do WhatsApp');
        return;
      }
      window.open(json.waLink, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoadingId(null);
    }
  }

  function Card(p: Product) {
    const qty = qtyFor(p.id);
    const busy = loadingId === p.id;

    return (
      <div key={p.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <Link href={`/produto/${p.slug}`} className="block">
          <div className="aspect-[4/3] bg-slate-900/40">
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain p-2" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">Sem imagem</div>
            )}
          </div>
          <div className="p-5">
            <div className="text-lg font-semibold">{p.name}</div>
            {p.sheet_code ? <div className="mt-1 text-xs text-slate-400">Cód: {p.sheet_code}</div> : null}
            <div className="mt-2 line-clamp-2 text-sm text-slate-300">{p.description ?? '—'}</div>
            <div className="mt-4 text-sm font-semibold text-slate-200">Cotação no WhatsApp (atacado)</div>
          </div>
        </Link>

        <div className="px-5 pb-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQtyById((curr) => ({ ...curr, [p.id]: Math.max(1, qty - 1) }))}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-slate-100 hover:bg-white/10"
            >
              −
            </button>
            <div className="w-12 text-center text-sm font-extrabold text-slate-100">{qty}</div>
            <button
              type="button"
              onClick={() => setQtyById((curr) => ({ ...curr, [p.id]: qty + 1 }))}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-slate-100 hover:bg-white/10"
            >
              +
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => quote(p)}
              className={
                busy
                  ? 'flex-1 rounded-xl bg-slate-800 px-4 py-2 text-sm font-extrabold text-slate-200'
                  : 'flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-emerald-400'
              }
            >
              {busy ? 'Gerando…' : 'Solicitar cotação'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-300">
          {filteredProducts.length} produto{filteredProducts.length === 1 ? '' : 's'}
          {query.trim() ? <span className="text-slate-500"> (filtrado)</span> : null}
        </div>

        <div className="relative w-full sm:w-[380px]">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar produto ou código…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-12 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
          />
          {query.trim() ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-extrabold text-slate-100 hover:bg-white/10"
              aria-label="Limpar busca"
            >
              Limpar
            </button>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {featured.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Destaques</h2>
            <div className="text-xs text-slate-400">Selecionados pela loja</div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featured.map((p) => Card(p))}</div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-extrabold">Produtos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{regular.map((p) => Card(p))}</div>
        {regular.length === 0 && featured.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Nenhum produto encontrado. Tente outro termo.
          </div>
        ) : null}
      </section>
    </>
  );
}
