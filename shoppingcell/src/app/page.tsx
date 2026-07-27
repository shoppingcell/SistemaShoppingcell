import Link from 'next/link';
import { SITE_LOGO_URL } from '@/lib/siteAssets';
import { supabase } from '@/lib/supabaseClient';
import { HomeFeaturedClient } from '@/app/HomeFeaturedClient';
import { ScrollScrubHeroClient } from '@/app/ScrollScrubHeroClient';
import { SiteHeaderClient } from '@/app/SiteHeaderClient';
import { ShimmerLink } from '@/components/ui/ShimmerLink';
import { TestimonialsSection } from '@/components/ui/testimonials-with-marquee';

export default async function HomePage() {
  const CONTACT = {
    company: 'Shopping Cell',
    addressLine: 'Parauapebas - PA',
    cityLine: 'Atacado para lojistas e assistências',
    phone: 'WhatsApp: +55 94 99281-4167',
    whatsappE164: process.env.NEXT_PUBLIC_WHATSAPP_E164 || '5594992814167',
  };

  // Featured products (vitrine atacado)
  const { data: featured, error: featuredErr } = await supabase
    .from('products')
    .select('id,name,slug,active,featured,sheet_code')
    .eq('active', true)
    .eq('featured', true)
    .order('updated_at', { ascending: false })
    .limit(8);

  const featuredIds = (featured ?? []).map((p: any) => p.id);

  const { data: latest } =
    featuredIds.length === 0
      ? await supabase
          .from('products')
          .select('id,name,slug,active,featured,sheet_code')
          .eq('active', true)
          .order('updated_at', { ascending: false })
          .limit(8)
      : { data: [] as any[] };

  const sourceProducts = featuredIds.length > 0 ? (featured ?? []) : (latest ?? []);
  const sourceIds = sourceProducts.map((p: any) => p.id);

  const { data: media } = sourceIds.length
    ? await supabase
        .from('product_media')
        .select('product_id,url')
        .eq('is_primary', true)
        .in('product_id', sourceIds)
    : { data: [] as any[] };

  const imageByProductId = new Map((media ?? []).map((m: any) => [m.product_id, m.url]));

  const featuredView = sourceProducts.map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    imageUrl: imageByProductId.get(p.id) ?? null,
    sheet_code: p.sheet_code ?? null,
  }));

  const usingFallback = featuredIds.length === 0;

  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeaderClient logoUrl={SITE_LOGO_URL} />

      {/* CINEMATIC HERO (stable steps) */}
      <div className="px-4 pt-6">
        <div className="mx-auto max-w-7xl">
          <ScrollScrubHeroClient
            framesDir="/hero/frames"
            frameCount={27}
            smoothFactor={0.35}
            easePower={1.2}
            heightVh={140}
          />
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.96))] p-6 shadow-[0_0_80px_rgba(34,211,238,0.1)] sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200">
                Portal público • painel interno
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                Revenda de peças Apple com catálogo, estoque e gestão em um só lugar.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                A Shopping Cell conecta a vitrine para lojistas e assistências ao painel da equipe, organizando produtos, disponibilidade e pedidos com mais agilidade.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <ShimmerLink
                  href="/catalogo"
                  className="text-slate-950"
                  background="rgba(234, 179, 8, 1)"
                  shimmerColor="#ffffff"
                >
                  Abrir catálogo
                </ShimmerLink>

                <ShimmerLink
                  href="/login?next=/admin"
                  className="text-white"
                  background="rgba(15, 23, 42, 0.95)"
                  shimmerColor="rgba(34, 211, 238, 0.95)"
                >
                  Entrar no painel
                </ShimmerLink>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 backdrop-blur">
                <div className="text-sm font-semibold text-emerald-200">Área pública</div>
                <div className="mt-1 text-lg font-semibold text-white">Catálogo para revenda</div>
                <p className="mt-2 text-sm text-slate-300">
                  Exibe produtos e itens ativos sem expor preços, direcionando a cotação pelo WhatsApp.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 backdrop-blur">
                <div className="text-sm font-semibold text-sky-200">Painel administrativo</div>
                <div className="mt-1 text-lg font-semibold text-white">Gestão do negócio</div>
                <p className="mt-2 text-sm text-slate-300">
                  Centraliza cadastro de produtos, estoque, pedidos e dashboard para a operação.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            {[
              { title: 'Catálogo', text: 'Produtos e categorias organizados para venda' },
              { title: 'Estoque', text: 'Disponibilidade e entradas/saídas centralizadas' },
              { title: 'Pedidos', text: 'Fluxo para WhatsApp e confirmação de vendas' },
              { title: 'Dashboard', text: 'Visão geral para gestão da operação' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-sm text-slate-400">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-6 sm:p-8">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Como o sistema funciona
            </div>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Da vitrine ao fechamento do pedido</h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                title: '1. Publicar',
                text: 'A vitrine mostra os itens ativos para lojistas e assistências.',
              },
              {
                title: '2. Gerenciar',
                text: 'A equipe controla estoque, categorias e produtos no painel administrativo.',
              },
              {
                title: '3. Fechar',
                text: 'O pedido é acompanhado e concluído com apoio do WhatsApp.',
              },
            ].map((step) => (
              <div key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-semibold text-cyan-200">{step.title}</div>
                <div className="mt-2 text-sm text-slate-300">{step.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials / Comentários */}
      <TestimonialsSection
        title="Comentários reais (Google)"
        description="Depoimentos reais da loja no Google Maps. Clique para abrir a avaliação."
        testimonials={[
          {
            author: {
              name: 'Cliente Google',
              handle: 'Avaliação 1',
              avatar:
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
            },
            text: 'Comentário real no Google Maps. Toque para abrir a avaliação completa.',
            href: 'https://share.google/KJjghkGv2UdDT0M9B',
          },
          {
            author: {
              name: 'Cliente Google',
              handle: 'Avaliação 2',
              avatar:
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
            },
            text: 'Comentário real no Google Maps. Toque para abrir a avaliação completa.',
            href: 'https://share.google/OZj5ETjWj9xs0sGdp',
          },
          {
            author: {
              name: 'Cliente Google',
              handle: 'Avaliação 3',
              avatar:
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
            },
            text: 'Comentário real no Google Maps. Toque para abrir a avaliação completa.',
            href: 'https://share.google/meZvbfWfm7jQ61BtP',
          },
          {
            author: {
              name: 'Cliente Google',
              handle: 'Avaliação 4',
              avatar:
                'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop&crop=face',
            },
            text: 'Comentário real no Google Maps. Toque para abrir a avaliação completa.',
            href: 'https://share.google/PPuhpw4TYC6IMFotF',
          },
          {
            author: {
              name: 'Cliente Google',
              handle: 'Avaliação 5',
              avatar:
                'https://images.unsplash.com/photo-1541534401786-2077eed87a72?w=150&h=150&fit=crop&crop=face',
            },
            text: 'Comentário real no Google Maps. Toque para abrir a avaliação completa.',
            href: 'https://share.google/MrltRxzmiN4WTFvtR',
          },
          {
            author: {
              name: 'Cliente Google',
              handle: 'Avaliação 6',
              avatar:
                'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=150&h=150&fit=crop&crop=face',
            },
            text: 'Comentário real no Google Maps. Toque para abrir a avaliação completa.',
            href: 'https://share.google/r2lNObvRlqnuffRTf',
          },
        ]}
      />

      {/* Featured products */}
      <section className="border-t border-slate-800 bg-slate-950/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {usingFallback ? 'Catálogo em destaque' : 'Destaque do atacado'}
              </div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Escolha itens e peça a cotação</h2>
              <p className="mt-2 text-sm text-slate-400">
                {usingFallback
                  ? 'Ainda sem itens marcados como destaque. Exibindo novidades do catálogo para não ficar vazio.'
                  : 'Selecione a quantidade e envie a lista pelo WhatsApp.'}
              </p>
            </div>
            <Link href="/catalogo" className="text-sm font-semibold text-yellow-300 hover:text-yellow-200">
              Abrir catálogo →
            </Link>
          </div>

          {featuredErr ? (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              Erro ao carregar destaques: {featuredErr.message}
            </div>
          ) : featuredView.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              Ainda não há produtos ativos para mostrar. Cadastre no Admin → Produtos para liberar o catálogo.
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-2">
              {usingFallback ? (
                <div className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-amber-200">
                  Mostrando novidades até você marcar produtos como destaque
                </div>
              ) : null}
              <HomeFeaturedClient products={featuredView} />
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-sm font-extrabold text-slate-100">{CONTACT.company}</div>
              <div className="mt-2 text-sm text-slate-400">Peças Apple no atacado.</div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Endereço</div>
              <div className="mt-2 text-sm text-slate-300">{CONTACT.addressLine}</div>
              <div className="mt-1 text-sm text-slate-400">{CONTACT.cityLine}</div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contato</div>
              <div className="mt-2 text-sm text-slate-300">{CONTACT.phone}</div>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href="/contato" className="text-sm font-semibold text-yellow-300 hover:text-yellow-200">
                  Fale conosco
                </Link>
                {CONTACT.whatsappE164 ? (
                  <a
                    href={`https://wa.me/${CONTACT.whatsappE164.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-emerald-300 hover:text-emerald-200"
                  >
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-800 pt-8 text-sm text-slate-500">
            © {new Date().getFullYear()} SHOPPING CELL. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </main>
  );
}
