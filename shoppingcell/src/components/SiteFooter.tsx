import Link from 'next/link';
import { ArrowUpRight, Facebook, Instagram, MapPin, MessageCircle, ShieldCheck, Smartphone, Youtube } from 'lucide-react';
import { GOOGLE_MAPS_DIRECTIONS_URL, SHOPPING_CELL_ADDRESS } from '@/lib/siteLinks';

export function SiteFooter() {
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_E164 || '5594992814167').replace(/\D/g, '');
  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  const socialLinks = [
    { label: 'Facebook', href: process.env.NEXT_PUBLIC_FACEBOOK_URL, icon: Facebook },
    { label: 'YouTube', href: process.env.NEXT_PUBLIC_YOUTUBE_URL, icon: Youtube },
  ].filter((item): item is { label: string; href: string; icon: typeof Instagram } => Boolean(item.href));

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.08] bg-[#050505] text-white">
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-amber-400/[0.07] blur-3xl" />
      <div className="mx-auto max-w-[1500px] px-5 py-14 lg:px-10 lg:py-20">
        <div className="grid gap-12 border-b border-white/[0.08] pb-14 lg:grid-cols-[1.25fr_0.7fr_0.7fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400 text-black"><Smartphone size={21} /></span>
              <span className="text-xl font-extrabold tracking-[-0.04em]">SHOPPING <span className="text-amber-400">CELL</span></span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-zinc-500">Peças Apple para lojistas e assistências, com catálogo organizado, atendimento humano e cotação rápida.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 hover:border-emerald-400/40 hover:text-emerald-400"><MessageCircle size={18} /></a>
              {instagramUrl ? <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 hover:border-pink-400/40 hover:text-pink-400"><Instagram size={18} /></a> : <span aria-label="Instagram — aguardando perfil oficial" title="Informe o perfil oficial do Instagram para ativar este botão" className="grid h-11 w-11 cursor-help place-items-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-600"><Instagram size={18} /></span>}
              {socialLinks.map(({ label, href, icon: Icon }) => <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 hover:border-amber-400/40 hover:text-amber-400"><Icon size={18} /></a>)}
            </div>
          </div>

          <div><div className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-300">Comprar</div><nav className="mt-5 grid gap-3 text-sm text-zinc-500"><Link href="/catalogo" className="hover:text-white">Catálogo completo</Link><Link href="/catalogo" className="hover:text-white">Produtos em destaque</Link><Link href="/contato" className="hover:text-white">Solicitar cotação</Link></nav></div>
          <div><div className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-300">Shopping Cell</div><nav className="mt-5 grid gap-3 text-sm text-zinc-500"><Link href="/" className="hover:text-white">Início</Link><Link href="/contato" className="hover:text-white">Atendimento</Link><Link href="/politica-de-privacidade" className="hover:text-white">Política de Privacidade</Link><Link href="/termos-de-servico" className="hover:text-white">Termos de Serviço</Link><Link href="/login?next=/admin" className="hover:text-white">Área da equipe</Link></nav></div>
          <div><div className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-300">Atendimento</div><div className="mt-5 grid gap-4 text-sm text-zinc-500"><a href={GOOGLE_MAPS_DIRECTIONS_URL} target="_blank" rel="noreferrer" className="flex gap-3 hover:text-white"><MapPin size={17} className="mt-0.5 shrink-0 text-amber-400" /><span>{SHOPPING_CELL_ADDRESS}<br /><strong className="mt-1 inline-block text-xs text-amber-400">Abrir rota no Google Maps</strong></span></a><div className="flex gap-3"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-amber-400" /><span>Compra acompanhada por atendimento humano.</span></div><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 font-bold text-white hover:text-amber-400">Falar com a equipe <ArrowUpRight size={15} /></a></div></div>
        </div>
        <div className="flex flex-col gap-3 pt-7 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Shopping Cell. Todos os direitos reservados.</span>
          <div className="flex items-center gap-4">
            <Link href="/politica-de-privacidade" className="hover:text-zinc-300">Privacidade</Link>
            <span>•</span>
            <Link href="/termos-de-servico" className="hover:text-zinc-300">Termos</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
