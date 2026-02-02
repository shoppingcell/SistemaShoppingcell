import Link from 'next/link';
import IphoneScrollExplode from '@/components/IphoneScrollExplode';
import { SITE_LOGO_URL } from '@/lib/siteAssets';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `R$ ${Number(n).toFixed(2)}`;
}

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  // CONTACT (fill later)
  const CONTACT = {
    company: 'Shopping Cell',
    addressLine: 'Endereço (me envie pra eu colocar certinho)',
    cityLine: 'Cidade - UF',
    phone: '(xx) xxxxx-xxxx',
    whatsappE164: process.env.NEXT_PUBLIC_WHATSAPP_E164 || '',
  };

  // Featured products (vitrine)
  let featured: any[] = [];
  let featuredErr: any = null;

  const attempt = await supabase
    .from('products')
    .select('id,name,slug,price,active,featured')
    .eq('active', true)
    .eq('featured', true)
    .order('updated_at', { ascending: false })
    .limit(8);

  if (attempt.error && /column .*featured.* does not exist/i.test(attempt.error.message)) {
    // fallback: show any active products
    const fallback = await supabase
      .from('products')
      .select('id,name,slug,price,active')
      .eq('active', true)
      .order('updated_at', { ascending: false })
      .limit(8);
    featured = (fallback.data as any) ?? [];
    featuredErr = fallback.error;
  } else {
    featured = (attempt.data as any) ?? [];
    featuredErr = attempt.error;
  }

  const featuredIds = featured.map((p) => p.id);
  const { data: media } = featuredIds.length
    ? await supabase
        .from('product_media')
        .select('product_id,url')
        .eq('is_primary', true)
        .in('product_id', featuredIds)
    : { data: [] as any[] };

  const imageByProductId = new Map((media ?? []).map((m: any) => [m.product_id, m.url]));

  const testimonials = [
    {
      name: 'Assistência Técnica A',
      text: 'Chegou rápido e com ótima qualidade. Atendimento muito bom.',
    },
    {
      name: 'Assistência Técnica B',
      text: 'Peças confiáveis e com garantia. Recomendo pra quem trabalha com Apple.',
    },
    {
      name: 'Loja C',
      text: 'Preço justo e catálogo sempre atualizado. Virou fornecedor fixo.',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE_LOGO_URL} alt="ShoppingCell" className="h-8 w-auto" />
          </div>
          <nav className="flex items-center gap-6 text-sm text-slate-200">
            <Link href="/catalogo" className="hover:text-white">
              Peças Apple
            </Link>
            <Link href="/contato" className="hover:text-white">
              Contato
            </Link>
          </nav>
          <Link
            href="/admin"
            className="rounded-md bg-yellow-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-yellow-400"
          >
            ÁREA DO LOJISTA
          </Link>
        </div>
      </header>

      {/* HERO + EFFECT (top of page) */}
      <IphoneScrollExplode />

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Qualidade Garantida',
              desc: 'Peças selecionadas com garantia e procedência.',
            },
            {
              title: 'Entrega Rápida',
              desc: 'Envio para todo o Brasil com rastreio e suporte no pós-venda.',
            },
            {
              title: 'Suporte Especializado',
              desc: 'Equipe pronta para ajudar na escolha da peça certa.',
            },
          ].map((x) => (
            <div key={x.title} className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
              <h3 className="text-lg font-extrabold text-slate-100">{x.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{x.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/catalogo"
            className="rounded-2xl bg-yellow-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-yellow-400"
          >
            Ver catálogo
          </Link>
          <Link
            href="/contato"
            className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-emerald-400"
          >
            Fale conosco
          </Link>
        </div>
      </section>

      {/* Vitrine */}
      <section className="border-t border-slate-800 bg-slate-950/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">E-commerce</div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Vitrine de destaques</h2>
              <p className="mt-2 text-sm text-slate-400">Produtos em destaque para compra rápida.</p>
            </div>
            <Link href="/catalogo" className="text-sm font-semibold text-yellow-300 hover:text-yellow-200">
              Ver tudo →
            </Link>
          </div>

          {featuredErr ? (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              Erro ao carregar vitrine: {featuredErr.message}
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(featured ?? []).map((p: any) => (
                <Link
                  key={p.id}
                  href={`/produto/${p.slug}`}
                  className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 hover:border-slate-700"
                >
                  <div className="aspect-[4/3] w-full bg-slate-900/40">
                    {imageByProductId.get(p.id) ? (
                      <div className="flex h-full w-full items-center justify-center p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageByProductId.get(p.id)}
                          alt={p.name}
                          className="h-full w-full object-contain opacity-95 transition group-hover:scale-[1.02]"
                        />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400">
                          Sem imagem
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="truncate text-sm font-extrabold text-slate-100">{p.name}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm font-semibold text-yellow-300">{money(p.price)}</div>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                        Ver
                      </span>
                    </div>
                  </div>
                </Link>
              ))}

              {(featured ?? []).length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300 sm:col-span-2 lg:col-span-4">
                  Ainda não há produtos em destaque. Marque {`"Destaque"`} no Admin → Produtos.
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/catalogo"
              className="rounded-2xl bg-yellow-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-yellow-400"
            >
              Comprar agora
            </Link>
            <Link
              href="/contato"
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              Tirar dúvida
            </Link>
          </div>
        </div>
      </section>

      {/* Comentários */}
      <section className="border-t border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Comentários</div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">O que os clientes dizem</h2>
              <p className="mt-2 text-sm text-slate-400">Depoimentos rápidos de quem compra no atacado.</p>
            </div>
            <Link href="/contato" className="text-sm font-semibold text-yellow-300 hover:text-yellow-200">
              Quero comprar →
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
                <div className="text-sm font-extrabold text-slate-100">{t.name}</div>
                <div className="mt-3 text-sm text-slate-300">“{t.text}”</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
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
