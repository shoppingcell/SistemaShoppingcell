'use client';

import Link from 'next/link';
import {
  Check,
  ChevronRight,
  Minus,
  Package,
  Play,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatBRLFromCents } from '@/lib/formatPrice';

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured: boolean;
  imageUrl: string | null;
  sheet_code?: string | null;
  base_price_cents?: number | null;
};

type CartItem = {
  id: string;
  name: string;
  slug: string;
  code?: string | null;
  price_cents: number;
  qty: number;
};

type ToastInfo = {
  productName: string;
  qty: number;
};

const LS_KEY = 'shoppingcell_cart_v1';
const normalize = (value: string) =>
  value.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');
const isVideo = (url?: string | null) => Boolean(url && /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(url));

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.name) : [];
  } catch {
    return [];
  }
}

export default function CatalogoClient({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastInfo | null>(null);

  useEffect(() => setCart(loadCart()), []);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, JSON.stringify(cart));
  }, [cart]);

  const filteredProducts = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return products;
    return products.filter((product) =>
      normalize([product.name, product.description ?? '', product.sheet_code ?? ''].join(' ')).includes(needle),
    );
  }, [products, query]);
  const featured = filteredProducts.filter((product) => product.featured);
  const regular = filteredProducts.filter((product) => !product.featured);
  const itemCount = cart.reduce((total, item) => total + item.qty, 0);
  const totalCents = cart.reduce((total, item) => total + item.price_cents * item.qty, 0);

  function selectedQuantity(id: string) {
    return Math.max(1, Math.min(999, Number(qtyById[id] || 1)));
  }

  function addToCart(product: Product) {
    const quantity = selectedQuantity(product.id);
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, qty: item.qty + quantity } : item);
      return [...current, {
        id: product.id,
        name: product.name,
        slug: product.slug,
        code: product.sheet_code,
        price_cents: Number(product.base_price_cents || 0),
        qty: quantity,
      }];
    });

    setAddedId(product.id);
    setToast({ productName: product.name, qty: quantity });

    window.setTimeout(() => setAddedId((current) => current === product.id ? null : current), 1500);
    window.setTimeout(() => setToast(null), 4000);
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item)
      .filter((item) => item.qty > 0));
  }

  async function checkout() {
    if (!cart.length) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/whatsapp/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            name: item.name,
            code: item.code || null,
            qty: item.qty,
            url: `${window.location.origin}/produto/${item.slug}`,
          })),
          notes: totalCents > 0 ? `Total estimado no catálogo: ${formatBRLFromCents(totalCents)}` : null,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok || !json?.waLink) {
        setError(json?.error || 'Não foi possível abrir a cotação. Tente novamente.');
        return;
      }
      window.open(json.waLink, '_blank', 'noopener,noreferrer');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a cotação.');
    } finally {
      setLoading(false);
    }
  }

  function ProductCard({ product }: { product: Product }) {
    const inCart = cart.find((item) => item.id === product.id)?.qty || 0;
    const quantity = selectedQuantity(product.id);
    const justAdded = addedId === product.id;
    return (
      <article className="group flex overflow-hidden rounded-[1.6rem] border border-white/[0.08] bg-[#0b0b0c] transition duration-300 hover:-translate-y-1 hover:border-amber-400/25 sm:block">
        <Link href={`/produto/${product.slug}`} className="relative block w-[38%] shrink-0 overflow-hidden bg-black sm:aspect-square sm:w-full" aria-label={`Ver detalhes de ${product.name}`}>
          {product.imageUrl ? (
            isVideo(product.imageUrl) ? (
              <video src={product.imageUrl} muted playsInline loop autoPlay preload="metadata" className="h-full w-full object-contain p-3 sm:p-5" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-[1.04] sm:p-5" />
            )
          ) : <div className="flex h-full min-h-40 items-center justify-center text-zinc-800"><Package size={38} /></div>}
          {isVideo(product.imageUrl) && <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold backdrop-blur"><Play size={10} fill="currentColor" /> VÍDEO</span>}
          {product.featured && <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-black">Destaque</span>}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
          <Link href={`/produto/${product.slug}`} className="block">
            {product.sheet_code && <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-400">Cód. {product.sheet_code}</div>}
            <h3 className="mt-1.5 line-clamp-2 text-base font-bold leading-5 tracking-tight sm:text-lg sm:leading-6">{product.name}</h3>
            <p className="mt-2 hidden line-clamp-2 text-xs leading-5 text-zinc-500 sm:block">{product.description || 'Consulte disponibilidade e condições.'}</p>
          </Link>
          <div className="mt-auto pt-4">
            {Number(product.base_price_cents || 0) > 0 ? (
              <div className="mb-3 text-base font-extrabold text-white">{formatBRLFromCents(Number(product.base_price_cents))}</div>
            ) : <div className="mb-3 text-[11px] font-semibold text-zinc-500">Preço sob consulta</div>}
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Quantidade</span>
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
                <button type="button" aria-label={`Diminuir quantidade de ${product.name}`} onClick={() => setQtyById((current) => ({ ...current, [product.id]: Math.max(1, quantity - 1) }))} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><Minus size={13} /></button>
                <span className="w-7 text-center text-sm font-extrabold" aria-live="polite">{quantity}</span>
                <button type="button" aria-label={`Aumentar quantidade de ${product.name}`} onClick={() => setQtyById((current) => ({ ...current, [product.id]: Math.min(999, quantity + 1) }))} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><Plus size={13} /></button>
              </div>
            </div>
            <button type="button" onClick={() => addToCart(product)} className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-xs font-extrabold transition ${justAdded ? 'bg-emerald-400 text-black' : 'bg-amber-400 text-black hover:bg-amber-300'}`}>
              {justAdded ? <><Check size={15} /> Adicionado!</> : <><ShoppingBag size={15} /> {inCart ? `Adicionar mais (${inCart})` : 'Adicionar ao carrinho'}</>}
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <>
      <div className="sticky top-20 z-30 -mx-5 border-y border-white/[0.07] bg-black/90 px-5 py-3 backdrop-blur-xl lg:-mx-10 lg:px-10">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto ou código…" className="field py-3 pl-11 pr-11" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X size={17} /></button>}
          </div>
          <button type="button" onClick={() => setCartOpen(true)} className="relative flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-amber-400 px-4 text-sm font-extrabold text-black hover:bg-amber-300 sm:px-5">
            <ShoppingBag size={18} /><span className="hidden sm:inline">Meu carrinho</span>
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-black px-1 text-[11px] text-white">{itemCount}</span>
          </button>
        </div>
      </div>

      <div className="mt-7 flex items-center justify-between text-sm text-zinc-500"><span><strong className="text-white">{filteredProducts.length}</strong> produtos encontrados</span><span className="hidden text-xs sm:block">Escolha sem sair desta página</span></div>
      {featured.length > 0 && <section className="mt-10"><div className="flex items-end justify-between"><h2 className="text-2xl font-extrabold tracking-tight">Destaques</h2><span className="text-xs text-zinc-600">Selecionados pela loja</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{featured.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>}
      <section className="mt-12"><h2 className="text-2xl font-extrabold tracking-tight">Todos os produtos</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{regular.map((product) => <ProductCard key={product.id} product={product} />)}</div>{!regular.length && !featured.length && <div className="surface mt-5 p-8 text-sm text-zinc-400">Nenhum produto encontrado. Tente outro termo.</div>}</section>

      {itemCount > 0 && !cartOpen && <button type="button" onClick={() => setCartOpen(true)} className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-amber-400 px-5 py-3.5 text-sm font-extrabold text-black shadow-[0_18px_60px_rgba(0,0,0,0.55)] lg:hidden"><ShoppingBag size={18} /> Ver carrinho <span className="rounded-full bg-black px-2 py-0.5 text-xs text-white">{itemCount}</span></button>}

      {/* Floating Toast Notification when adding item */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[90] flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-neutral-950/95 p-4 shadow-[0_10px_40px_rgba(250,204,21,0.25)] backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
            <CheckCircle2 size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-white">Item adicionado ao carrinho! 🛒</div>
            <div className="text-xs text-slate-300 font-semibold truncate max-w-[200px]">
              {toast.qty}x {toast.productName}
            </div>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="ml-2 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 shadow-md transition hover:bg-amber-300"
          >
            Ver Carrinho
          </button>
        </div>
      )}

      {cartOpen && <div className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm" onMouseDown={() => setCartOpen(false)}>
        <aside className="ml-auto flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#090909] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5"><div><div className="text-lg font-extrabold">Seu carrinho</div><div className="mt-1 text-xs text-zinc-500">{itemCount} {itemCount === 1 ? 'item selecionado' : 'itens selecionados'}</div></div><button type="button" onClick={() => setCartOpen(false)} aria-label="Fechar carrinho" className="grid h-11 w-11 place-items-center rounded-full border border-white/10 hover:bg-white/5"><X size={19} /></button></div>
          <div className="flex-1 overflow-y-auto p-5">
            {!cart.length ? <div className="flex h-full flex-col items-center justify-center text-center"><div className="grid h-16 w-16 place-items-center rounded-full bg-white/5 text-zinc-600"><ShoppingBag size={26} /></div><div className="mt-5 font-bold">Seu carrinho está vazio</div><p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">Adicione produtos do catálogo para montar uma única cotação.</p></div> : <div className="grid gap-3">{cart.map((item) => <div key={item.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/produto/${item.slug}`} onClick={() => setCartOpen(false)} className="line-clamp-2 text-sm font-bold hover:text-amber-400">{item.name}</Link>{item.code && <div className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">Cód. {item.code}</div>}</div><button type="button" onClick={() => setCart((current) => current.filter((currentItem) => currentItem.id !== item.id))} aria-label={`Remover ${item.name}`} className="text-zinc-600 hover:text-red-300"><Trash2 size={16} /></button></div><div className="mt-4 flex items-center justify-between"><div className="flex items-center gap-2"><button type="button" onClick={() => changeQuantity(item.id, -1)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 hover:bg-white/5"><Minus size={14} /></button><span className="w-7 text-center text-sm font-bold">{item.qty}</span><button type="button" onClick={() => changeQuantity(item.id, 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 hover:bg-white/5"><Plus size={14} /></button></div>{item.price_cents > 0 && <div className="text-sm font-bold">{formatBRLFromCents(item.price_cents * item.qty)}</div>}</div></div>)}</div>}
          </div>
          <div className="border-t border-white/10 bg-black p-5">{totalCents > 0 && <div className="mb-4 flex items-end justify-between"><span className="text-xs text-zinc-500">Total estimado</span><strong className="text-xl">{formatBRLFromCents(totalCents)}</strong></div>}{error && <div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{error}</div>}<button type="button" disabled={!cart.length || loading} onClick={checkout} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-extrabold text-black hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">{loading ? 'Preparando cotação…' : <>Finalizar pelo WhatsApp <ChevronRight size={18} /></>}</button><p className="mt-3 text-center text-[10px] leading-4 text-zinc-600">Disponibilidade, frete e condições serão confirmados pela equipe.</p></div>
        </aside>
      </div>}
    </>
  );
}
