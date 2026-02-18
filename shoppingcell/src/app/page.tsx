import Link from 'next/link';
import { SITE_LOGO_URL } from '@/lib/siteAssets';
import { supabase } from '@/lib/supabaseClient';
import { HomeFeaturedClient } from '@/app/HomeFeaturedClient';
import { HomeHeroStepsClient } from '@/app/HomeHeroStepsClient';
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
  const { data: media } = featuredIds.length
    ? await supabase
        .from('product_media')
        .select('product_id,url')
        .eq('is_primary', true)
        .in('product_id', featuredIds)
    : { data: [] as any[] };

  const imageByProductId = new Map((media ?? []).map((m: any) => [m.product_id, m.url]));

  const featuredView = (featured ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    imageUrl: imageByProductId.get(p.id) ?? null,
    sheet_code: p.sheet_code ?? null,
  }));

  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeaderClient logoUrl={SITE_LOGO_URL} />

      {/* CINEMATIC HERO (stable steps) */}
      <div className="px-4 pt-6">
        <div className="mx-auto max-w-7xl">
          <HomeHeroStepsClient
            closedSrc="/hero/closed.jpg?v=8"
            openMp4Src="/hero/scroll.mp4?v=8"
            openWebmSrc="/hero/scroll.webm?v=8"
            openPosterSrc="/hero/poster.jpg?v=8"
            finalSrc="/hero/frame_026.jpg?v=8"
          />
        </div>
      </div>

      {/* Minimal CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-extrabold">Atacado para lojistas e assistências</div>
              <div className="mt-1 text-sm text-slate-300">
                Sem preços no site. Cotação e fechamento no WhatsApp.
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ShimmerLink
                href={`https://wa.me/${CONTACT.whatsappE164.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-white"
                background="rgba(0, 0, 0, 1)"
                shimmerColor="rgba(16, 185, 129, 0.95)"
              >
                <span className="inline-flex items-center gap-2">
                  <svg aria-hidden="true" viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
                    <path d="M19.11 17.59c-.28-.14-1.66-.82-1.92-.92-.26-.1-.45-.14-.64.14-.19.28-.73.92-.89 1.11-.16.19-.33.21-.61.07-.28-.14-1.18-.43-2.25-1.37-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.17.19-.28.28-.47.09-.19.05-.36-.02-.5-.07-.14-.64-1.54-.88-2.11-.23-.55-.47-.47-.64-.48h-.55c-.19 0-.5.07-.76.36-.26.28-1 0.98-1 2.39s1.03 2.78 1.17 2.97c.14.19 2.02 3.08 4.89 4.32.68.29 1.21.46 1.62.59.68.22 1.29.19 1.78.12.54-.08 1.66-.68 1.9-1.34.24-.66.24-1.23.17-1.34-.07-.11-.26-.18-.54-.32z" />
                    <path d="M16.04 3C9.45 3 4.09 8.36 4.09 14.95c0 2.32.66 4.59 1.92 6.55L4 29l7.72-2.03c1.9 1.04 4.05 1.58 6.3 1.58h.01c6.59 0 11.95-5.36 11.95-11.95C29.97 8.36 24.61 3 18.02 3h-1.98zm6.78 20.22c-.29.83-1.68 1.62-2.35 1.7-.62.08-1.42.11-2.28-.14-.52-.16-1.19-.39-2.06-.77-3.63-1.57-6-5.43-6.18-5.67-.18-.24-1.48-1.97-1.48-3.76 0-1.79.93-2.67 1.26-3.03.33-.36.72-.45.96-.45.24 0 .48 0 .69.01.22.01.52-.08.81.62.29.7.99 2.41 1.07 2.58.08.17.14.37.03.59-.11.22-.16.37-.32.57-.16.2-.34.45-.49.6-.16.16-.32.33-.14.65.18.33.8 1.32 1.71 2.14 1.17 1.04 2.16 1.36 2.48 1.51.32.16.5.13.69-.08.19-.21.79-.92 1.01-1.24.22-.32.43-.26.72-.16.29.1 1.84.87 2.16 1.03.32.16.53.24.61.37.08.13.08.75-.21 1.58z" />
                  </svg>
                  Comprar no WhatsApp
                </span>
              </ShimmerLink>

              <ShimmerLink
                href="/catalogo"
                className="text-slate-950"
                background="rgba(234, 179, 8, 1)"
                shimmerColor="#ffffff"
              >
                Ver catálogo
              </ShimmerLink>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
            {['Pronta entrega', 'Atacado', 'Envio', 'WhatsApp rápido'].map((x) => (
              <span key={x} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {x}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials / Comentários */}
      <TestimonialsSection
        title="Comentários de clientes"
        description="Algumas experiências de quem já compra com a gente."
        testimonials={[
          {
            author: {
              name: 'Carlos',
              handle: 'Assistência',
              avatar:
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
            },
            text: 'Chegou rápido e a qualidade das peças é muito boa. Atendimento no WhatsApp agiliza demais.',
          },
          {
            author: {
              name: 'Mariana',
              handle: 'Loja',
              avatar:
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
            },
            text: 'Cotação rápida e estoque sempre atualizado. Ajuda muito no atacado.',
          },
          {
            author: {
              name: 'Rafael',
              handle: 'Técnico',
              avatar:
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
            },
            text: 'Padrão de qualidade alto. Recomendo pra quem trabalha com manutenção.',
          },
        ]}
      />

      {/* Featured products */}
      <section className="border-t border-slate-800 bg-slate-950/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Destaque do atacado
              </div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Escolha itens e peça a cotação</h2>
              <p className="mt-2 text-sm text-slate-400">
                Selecione a quantidade e envie a lista pelo WhatsApp.
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
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Ainda não há produtos em destaque. Marque &quot;Destaque&quot; no Admin → Produtos.
            </div>
          ) : (
            <div className="mt-8">
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
