import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock3, MapPin, MessageCircle, PackageSearch } from 'lucide-react';
import { SITE_LOGO_URL } from '@/lib/siteAssets';
import { SiteHeaderClient } from '@/app/SiteHeaderClient';
import { SiteFooter } from '@/components/SiteFooter';

export default function ContatoPage() {
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_E164 || '5594992814167').replace(/\D/g, '');
  const waUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá! Vim pelo site da Shopping Cell e gostaria de solicitar uma cotação.')}`;

  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeaderClient logoUrl={SITE_LOGO_URL} />
      <section className="relative overflow-hidden px-5 pb-20 pt-36 lg:px-10 lg:pb-28 lg:pt-44">
        <div className="absolute left-1/2 top-10 h-[600px] w-[900px] -translate-x-1/2 bg-[radial-gradient(circle,rgba(245,158,11,0.11),transparent_65%)]" />
        <div className="relative mx-auto max-w-[1200px]">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 hover:text-white"><ArrowLeft size={15} /> Início</Link>
          <div className="mt-14 max-w-4xl">
            <span className="eyebrow">Atendimento Shopping Cell</span>
            <h1 className="mt-5 text-5xl font-extrabold tracking-[-0.055em] sm:text-7xl">Vamos conversar sobre o seu estoque.</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">Nossa equipe ajuda a encontrar os produtos certos, confirmar disponibilidade e organizar sua cotação.</p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              [MessageCircle, 'WhatsApp', 'Atendimento comercial e cotações'],
              [Clock3, 'Horário', 'Segunda a sábado, em horário comercial'],
              [MapPin, 'Localização', 'Parauapebas — Pará'],
            ].map(([Icon, title, text]: any) => (
              <div key={title} className="surface p-6"><Icon size={22} className="text-amber-400" /><h2 className="mt-5 font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p></div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 rounded-[2rem] border border-amber-400/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(255,255,255,0.025))] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><div className="text-2xl font-extrabold tracking-tight">Receba sua cotação pelo WhatsApp</div><p className="mt-2 text-sm leading-6 text-zinc-400">Envie sua lista ou conte quais peças você procura. O atendimento continua com uma pessoa da equipe.</p></div>
            <a href={waUrl} target="_blank" rel="noreferrer" className="button-primary mt-3 px-7 py-4 text-sm lg:mt-0">Iniciar conversa <ArrowRight size={17} /></a>
          </div>

          <div className="mt-10 text-center"><Link href="/catalogo" className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white"><PackageSearch size={17} /> Prefere escolher primeiro? Abrir catálogo</Link></div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
