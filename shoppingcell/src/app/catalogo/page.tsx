import Link from 'next/link';
import { ArrowDown, ArrowLeft, CheckCircle2, MessageCircle, PackageSearch, Search, ShoppingBag, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SITE_LOGO_URL } from '@/lib/siteAssets';
import { SiteHeaderClient } from '@/app/SiteHeaderClient';
import CatalogoClient from '@/app/catalogo/CatalogoClient';
import { SiteFooter } from '@/components/SiteFooter';

export const revalidate = 60;

type Product = { id: string; name: string; slug: string; description: string | null; featured?: boolean | null; sheet_code?: string | null; price?: number | null; base_price_cents?: number | null };
type MediaRow = { product_id: string; url: string };

export default async function CatalogoPage() {
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_E164 || '5594992814167').replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá! Vim pelo catálogo da Shopping Cell e preciso de ajuda para montar meu pedido.')}`;
  const { data, error } = await supabase
    .from('products')
    .select('id,name,slug,description,featured,sheet_code,price,base_price_cents')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(120);

  const products = (data ?? []) as Product[];
  const { data: media } = products.length
    ? await supabase.from('product_media').select('product_id,url').eq('is_primary', true).in('product_id', products.map((item) => item.id))
    : { data: [] as MediaRow[] };
  const mediaByProductId = new Map((media as MediaRow[] | null | undefined)?.map((item) => [item.product_id, item.url]) ?? []);

  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeaderClient logoUrl={SITE_LOGO_URL} />
      <section className="relative overflow-hidden border-b border-white/[0.07] px-5 pb-12 pt-28 lg:px-10 lg:pb-16 lg:pt-32">
        <div className="absolute right-0 top-0 h-[520px] w-[760px] bg-[radial-gradient(circle,rgba(245,158,11,0.12),transparent_65%)]" />
        <div className="absolute -left-40 bottom-0 h-72 w-72 rounded-full bg-amber-400/[0.035] blur-3xl" />
        <div className="relative mx-auto max-w-[1500px]">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 hover:text-white"><ArrowLeft size={15} /> Início</Link>
          <div className="mt-7 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-14">
            <div>
              <span className="eyebrow"><Sparkles size={14} /> Compra rápida para sua loja</span>
              <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[0.98] tracking-[-0.055em] sm:text-5xl lg:text-6xl">Encontre, escolha e monte seu pedido.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">Veja os valores, escolha a quantidade e adicione vários produtos ao carrinho sem sair do catálogo.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a href="#produtos" className="button-primary min-h-12 px-6 text-sm">Explorar produtos <ArrowDown size={16} /></a>
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="button-secondary min-h-12 px-6 text-sm"><MessageCircle size={17} /> Preciso de ajuda</a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
                {['Preços visíveis', 'Carrinho com vários itens', 'Atendimento humano'].map((item) => <span key={item} className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-amber-400" /> {item}</span>)}
              </div>
            </div>

            <div className="hidden rounded-[2rem] border border-white/[0.09] bg-white/[0.035] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur sm:p-6 lg:block">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-5">
                <div><div className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Como comprar</div><div className="mt-1 text-lg font-extrabold">Seu pedido em 3 passos</div></div>
                <div className="flex items-center gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.07] px-4 py-3"><PackageSearch className="text-amber-400" size={21} /><div><div className="text-lg font-extrabold">{products.length}</div><div className="text-[9px] uppercase tracking-wider text-zinc-500">produtos</div></div></div>
              </div>
              <div className="mt-5 grid gap-3">
                <div className="flex items-center gap-4 rounded-2xl bg-black/35 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-amber-400"><Search size={17} /></span><div><div className="text-sm font-bold">1. Busque o produto</div><div className="mt-1 text-xs text-zinc-600">Pesquise por nome ou código.</div></div></div>
                <div className="flex items-center gap-4 rounded-2xl bg-black/35 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-amber-400"><ShoppingBag size={17} /></span><div><div className="text-sm font-bold">2. Escolha a quantidade</div><div className="mt-1 text-xs text-zinc-600">Adicione quantos itens precisar.</div></div></div>
                <div className="flex items-center gap-4 rounded-2xl bg-black/35 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-amber-400"><MessageCircle size={17} /></span><div><div className="text-sm font-bold">3. Envie seu carrinho</div><div className="mt-1 text-xs text-zinc-600">Finalize com nossa equipe no WhatsApp.</div></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="produtos" className="mx-auto scroll-mt-20 max-w-[1500px] px-5 py-10 lg:px-10 lg:py-14">
        {error ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-6">
            <div className="font-bold text-amber-100">Catálogo temporariamente indisponível.</div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Nossa equipe ainda pode consultar os itens e preparar sua cotação pelo WhatsApp.</p>
            <Link href="/contato" className="button-primary mt-5 px-5 py-3 text-sm">Falar com a equipe</Link>
          </div>
        ) : (
          <CatalogoClient products={products.map((product) => ({ ...product, featured: Boolean(product.featured), imageUrl: mediaByProductId.get(product.id) ?? null, sheet_code: product.sheet_code ?? null, base_price_cents: Number(product.base_price_cents || 0) > 0 ? Number(product.base_price_cents) : Math.round(Number(product.price || 0) * 100) }))} />
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
