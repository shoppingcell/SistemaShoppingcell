'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { EmptyState } from '@/app/admin/_components/ui/EmptyState';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort: number;
  productsCount: number;
};

export function CategoriasClient({ rows }: { rows: CategoryRow[] }) {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((c) => {
      if (!qq) return true;
      return c.name.toLowerCase().includes(qq) || c.slug.toLowerCase().includes(qq);
    });
  }, [rows, q]);

  return (
    <Panel>
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-200">Categorias</div>
            <div className="mt-1 text-xs text-slate-400">{filtered.length} exibidas</div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou slug…"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-yellow-500/40 focus:outline-none sm:w-72"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setView('cards')}
                className={
                  'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                  (view === 'cards'
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                }
              >
                Cards
              </button>
              <button
                onClick={() => setView('table')}
                className={
                  'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                  (view === 'table'
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                }
              >
                Tabela
              </button>
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma categoria" description="Crie uma categoria para organizar os produtos." />
      ) : view === 'cards' ? (
        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-slate-100">{c.name}</div>
                      <div className="mt-1 text-xs text-slate-500">/{c.slug}</div>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {c.productsCount} itens
                    </div>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ordem
                      </div>
                      <div className="mt-1 text-2xl font-extrabold text-slate-100">{c.sort}</div>
                    </div>

                    <Link
                      href={`/admin/categorias/${c.id}`}
                      className="rounded-2xl bg-yellow-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-yellow-300"
                    >
                      Editar
                    </Link>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                  <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-yellow-500/10 blur-2xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-white/10">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Ordem</th>
                <th className="px-6 py-4">Produtos</th>
                <th className="px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-6 py-4 font-semibold text-slate-100">{c.name}</td>
                  <td className="px-6 py-4 text-slate-300">{c.slug}</td>
                  <td className="px-6 py-4 text-slate-300">{c.sort}</td>
                  <td className="px-6 py-4 text-slate-300">{c.productsCount}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/categorias/${c.id}`}
                      className="font-semibold text-yellow-300 hover:text-yellow-200"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
