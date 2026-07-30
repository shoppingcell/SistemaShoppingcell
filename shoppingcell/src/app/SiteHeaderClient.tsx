'use client';

import Link from 'next/link';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';

export function SiteHeaderClient({ logoUrl }: { logoUrl?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-black/75 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-5 lg:px-10">
        <Link href="/" className="flex items-center gap-3" aria-label="Shopping Cell — início">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Shopping Cell" className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10" />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-black"><ShoppingBag size={20} /></span>
          )}
          <span className="text-base font-extrabold tracking-[-0.03em] text-white">
            SHOPPING <span className="text-amber-400">CELL</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
          <Link href="/" className="nav-link">Início</Link>
          <Link href="/catalogo" className="nav-link">Catálogo</Link>
          <Link href="/contato" className="nav-link">Contato</Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login?next=/admin" className="text-sm font-semibold text-zinc-400 transition hover:text-white">
            Área da equipe
          </Link>
          <Link href="/catalogo" className="button-primary px-5 py-2.5 text-sm">Ver produtos</Link>
        </div>

        <button type="button" onClick={() => setOpen((value) => !value)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-white md:hidden" aria-label={open ? 'Fechar menu' : 'Abrir menu'}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-black px-5 py-5 md:hidden">
          <nav className="grid gap-2" aria-label="Navegação móvel">
            {[['Início', '/'], ['Catálogo', '/catalogo'], ['Contato', '/contato'], ['Área da equipe', '/login?next=/admin']].map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-semibold text-zinc-300 hover:bg-white/5 hover:text-white">{label}</Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

export default SiteHeaderClient;
