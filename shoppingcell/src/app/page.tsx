import Link from 'next/link';
import { ArrowRight, BadgeCheck, Headphones, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { SITE_LOGO_URL } from '@/lib/siteAssets';
import { supabase } from '@/lib/supabaseClient';
import { HomeFeaturedClient } from '@/app/HomeFeaturedClient';
import { SiteHeaderClient } from '@/app/SiteHeaderClient';
import { ScrollScrubHeroClient } from '@/app/ScrollScrubHeroClient';
import { SiteFooter } from '@/components/SiteFooter';

export default async function HomePage() {
  const whatsappE164 = (process.env.NEXT_PUBLIC_WHATSAPP_E164 || '5594992814167').replace(/\D/g, '');
  const { data: highlighted } = await supabase
    .from('products')
    .select('id,name,slug,active,featured,sheet_code')
    .eq('active', true)
    .eq('featured', true)
    .order('updated_at', { ascending: false })
    .limit(8);

  const { data: latest } = !highlighted?.length
    ? await supabase
        .from('products')
        .select('id,name,slug,active,featured,sheet_code')
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(8)
    : { data: [] as any[] };

  const sourceProducts = highlighted?.length ? highlighted : latest ?? [];
  const ids = sourceProducts.map((product: any) => product.id);
  const { data: media } = ids.length
    ? await supabase.from('product_media').select('product_id,url').eq('is_primary', true).in('product_id', ids)
    : { data: [] as any[] };
  const imageById = new Map((media ?? []).map((item: any) => [item.product_id, item.url]));
  const products = sourceProducts.map((product: any) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    imageUrl: imageById.get(product.id) ?? null,
    sheet_code: product.sheet_code ?? null,
  }));


  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeaderClient logoUrl={SITE_LOGO_URL} />

      <ScrollScrubHeroClient />

      <section className="border-y border-white/[0.07] bg-zinc-950">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 divide-x divide-white/[0.07] px-5 lg:grid-cols-4 lg:px-10">
          {[
            [PackageCheck, 'Peças selecionadas', 'Curadoria para uso profissional'],
            [Truck, 'Envio ágil', 'Atendimento para todo o Brasil'],
            [ShieldCheck, 'Compra segura', 'Processo claro do pedido à entrega'],
            [Headphones, 'Suporte humano', 'Cotação direta pelo WhatsApp'],
          ].map(([Icon, title, text]: any) => (
            <div key={title} className="px-4 py-7 first:pl-0 lg:px-7">
              <Icon size={20} className="text-amber-400" />
              <div className="mt-3 text-sm font-bold text-white">{title}</div>
              <div className="mt-1 text-xs leading-5 text-zinc-500">{text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden px-5 py-24 lg:px-10 lg:py-32">
        <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-amber-400/[0.035] blur-3xl" />
        <div className="relative mx-auto max-w-[1500px]">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <span className="eyebrow">Estrutura para revenda</span>
              <h2 className="mt-5 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">
                Mais giro. Menos complicação.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-zinc-400 lg:justify-self-end lg:text-lg">
              A Shopping Cell conecta lojistas e assistências a um catálogo organizado de peças Apple, com atendimento comercial rápido e uma operação preparada para pedidos recorrentes.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              { number: '01', title: 'Encontre', text: 'Pesquise por nome ou código e descubra os itens disponíveis no catálogo.' },
              { number: '02', title: 'Monte a cotação', text: 'Ajuste as quantidades e envie a sua seleção diretamente para nossa equipe.' },
              { number: '03', title: 'Receba suporte', text: 'Confirme disponibilidade, condições e envio com atendimento humano.' },
            ].map((step) => (
              <article key={step.number} className="surface surface-hover min-h-64 p-7 sm:p-8">
                <div className="text-sm font-black text-amber-400">{step.number}</div>
                <h3 className="mt-14 text-2xl font-bold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-500">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.07] bg-zinc-950 px-5 py-24 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="eyebrow">Catálogo Shopping Cell</span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">Destaques para sua loja</h2>
              <p className="mt-4 max-w-xl text-zinc-500">Produtos selecionados para você consultar e solicitar uma cotação.</p>
            </div>
            <Link href="/catalogo" className="button-secondary px-6 py-3 text-sm">Ver catálogo completo <ArrowRight size={16} /></Link>
          </div>

          <div className="mt-12">
            {products.length ? (
              <HomeFeaturedClient products={products} />
            ) : (
              <div className="surface p-8 text-sm text-zinc-400">O catálogo está sendo atualizado. Fale com nossa equipe para consultar os itens disponíveis.</div>
            )}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto grid max-w-[1500px] overflow-hidden rounded-[2rem] border border-amber-400/20 bg-[radial-gradient(circle_at_75%_50%,rgba(245,158,11,0.18),transparent_36%),linear-gradient(135deg,#18130a,#090909_62%)] p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center lg:p-16">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-amber-400"><BadgeCheck size={18} /> Atendimento para revendedores</div>
            <h2 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-[-0.045em] sm:text-6xl">Pronto para abastecer o seu estoque?</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">Conte o que você procura e receba uma cotação personalizada da nossa equipe.</p>
          </div>
          <a href={`https://wa.me/${whatsappE164}?text=${encodeURIComponent('Olá! Vim pelo site da Shopping Cell e quero solicitar uma cotação.')}`} target="_blank" rel="noreferrer" className="button-primary mt-8 px-7 py-4 text-sm lg:mt-0">
            Falar no WhatsApp <ArrowRight size={17} />
          </a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
