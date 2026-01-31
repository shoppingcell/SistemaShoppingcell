import Link from 'next/link';
import IphoneScrollExplode from '@/components/IphoneScrollExplode';
import { SITE_LOGO_URL } from '@/lib/siteAssets';

export default function HomePage() {
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
            href="#"
            className="rounded-md bg-yellow-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-yellow-400"
          >
            LOGIN / CADASTRAR
          </Link>
        </div>
      </header>

      {/* HERO + EFFECT (top of page) */}
      <IphoneScrollExplode />

      {/* Rest of content */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Qualidade Garantida',
              desc: 'Peças genuínas com certificação e garantia de procedência.',
            },
            {
              title: 'Entrega Rápida',
              desc: 'Envio expresso para todo o Brasil com rastreamento.',
            },
            {
              title: 'Suporte Especializado',
              desc: 'Equipe técnica pronta para auxiliar na escolha.',
            },
          ].map((x) => (
            <div key={x.title} className="rounded-xl border border-slate-800 bg-slate-950 p-6">
              <h3 className="text-lg font-semibold">{x.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{x.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/catalogo"
            className="rounded-md bg-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
          >
            Ver catálogo
          </Link>
          <Link
            href="/contato"
            className="rounded-md bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Fale conosco
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-400">
          © {new Date().getFullYear()} SHOPPING CELL. Todos os direitos reservados.
        </div>
      </footer>
    </main>
  );
}
