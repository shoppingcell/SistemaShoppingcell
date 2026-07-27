"use client";

import Link from 'next/link';
import React from 'react';

export function SiteHeaderClient({ logoUrl }: { logoUrl?: string }) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="logo" className="h-8 w-auto" />
          ) : (
            <div className="text-lg font-extrabold text-white">SHOPPINGCELL</div>
          )}
        </Link>
        <nav className="text-sm text-slate-300">Atacado • Assistências</nav>
      </div>
    </header>
  );
}

export default SiteHeaderClient;
