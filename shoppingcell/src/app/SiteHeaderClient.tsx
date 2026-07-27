"use client";

import Link from 'next/link';
import React from 'react';

export function SiteHeaderClient({ logoUrl }: { logoUrl?: string }) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 py-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="logo" className="h-8 w-auto" />
          ) : (
            <div className="text-lg font-extrabold text-white">SHOPPINGCELL</div>
          )}
        </Link>

        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <Link href="/" className="rounded-full px-3 py-1.5 hover:bg-white/10 hover:text-white">
            Home
          </Link>
          <Link href="/catalogo" className="rounded-full px-3 py-1.5 hover:bg-white/10 hover:text-white">
            Catálogo
          </Link>
          <Link href="/login?next=/admin" className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 font-medium text-cyan-200 hover:bg-cyan-400/20">
            Painel admin
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default SiteHeaderClient;
