'use client';

import React from 'react';
import Link from 'next/link';

export default function Topbar({ title = 'Dashboard' }: { title?: string }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
        <div className="mt-1 text-sm text-slate-400">Visão geral rápida</div>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/admin/configuracoes" className="rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-200">
          Configurações
        </Link>
        <button className="rounded-lg bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-950">Novo</button>
      </div>
    </div>
  );
}
