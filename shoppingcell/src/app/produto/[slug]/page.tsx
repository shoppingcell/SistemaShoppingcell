import Link from 'next/link';
import { ArrowLeft, BadgeCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { formatBRLFromCents } from '@/lib/formatPrice';
import { SITE_LOGO_URL } from '@/lib/siteAssets';
import { SiteHeaderClient } from '@/app/SiteHeaderClient';
import ProductClient from '@/app/produto/[slug]/ProductClient';
import { ProductMediaGallery } from '@/app/produto/[slug]/ProductMediaGallery';
import { SiteFooter } from '@/components/SiteFooter';

export const revalidate = 60;
type Media = { id: string; url: string; alt: string | null; sort: number; is_primary: boolean };

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: product, error } = await supabase
    .from('products')
    .select('id,name,slug,description,price,base_price_cents')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!product) return notFound();

  const { data: media } = await supabase.from('product_media').select('id,url,alt,sort,is_primary').eq('product_id', product.id).order('is_primary', { ascending: false }).order('sort', { ascending: true });
  const images = (media as Media[] | null | undefined) ?? [];
  const productPriceCents = Number(product.base_price_cents || 0) > 0 ? Number(product.base_price_cents) : Math.round(Number(product.price || 0) * 100);
  const whatsappE164 = process.env.NEXT_PUBLIC_WHATSAPP_E164 || '5594992814167';

  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeaderClient logoUrl={SITE_LOGO_URL} />
      <div className="mx-auto max-w-[1400px] px-5 pb-20 pt-32 lg:px-10 lg:pt-36">
        <Link href="/catalogo" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 hover:text-white"><ArrowLeft size={15} /> Voltar ao catálogo</Link>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <ProductMediaGallery items={images} productName={product.name} />

          <section className="lg:sticky lg:top-28">
            <span className="eyebrow"><BadgeCheck size={14} /> Shopping Cell</span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">{product.name}</h1>
            <div className="mt-5 text-2xl font-extrabold text-amber-400">{formatBRLFromCents(productPriceCents)}</div>
            <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-zinc-400">{product.description || 'Consulte disponibilidade, condições e opções de envio com nossa equipe.'}</p>
            <div className="surface mt-8 p-5"><div className="text-sm font-bold">Cotação para revenda</div><p className="mt-2 text-xs leading-5 text-zinc-500">Adicione o item e finalize o atendimento pelo WhatsApp.</p><ProductClient product={{ ...product, base_price_cents: productPriceCents } as any} whatsappE164={whatsappE164} /></div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-zinc-500"><div className="surface p-4">Atendimento humano</div><div className="surface p-4">Envio para todo Brasil</div></div>
          </section>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
