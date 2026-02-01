'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { EmptyState } from '@/app/admin/_components/ui/EmptyState';

type Row = {
  id: string;
  name: string;
  slug: string;
  quantity: number;
  min: number;
  status: 'OK' | 'Baixo' | 'Zerado';
  locked: boolean;
  imageUrl?: string | null;
};

function badge(status: string) {
  const base = 'rounded-full px-3 py-1 text-xs font-semibold';
  if (status === 'OK') return `${base} bg-green-500/15 text-green-300`;
  if (status === 'Zerado') return `${base} bg-red-500/15 text-red-200`;
  return `${base} bg-yellow-400/15 text-yellow-200`;
}

export function EstoqueClient({ rows }: { rows: Row[] }) {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(term) || r.slug.toLowerCase().includes(term));
  }, [rows, q]);

  const summary = useMemo(() => {
    const low = filtered.filter((r) => r.status === 'Baixo').length;
    const zero = filtered.filter((r) => r.status === 'Zerado').length;
    return { low, zero };
  }, [filtered]);

  return (
    <Panel>
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-200">Itens</div>
            <div className="mt-1 text-xs text-slate-400">{filtered.length} produtos</div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome…"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-yellow-500/40 focus:outline-none sm:w-72"
            />

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                Baixo: <span className="font-semibold">{summary.low}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                Zerado: <span className="font-semibold">{summary.zero}</span>
              </div>

              <div className="ml-0 flex gap-2 md:ml-3">
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
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum item encontrado" description="Tente outro termo de busca." />
      ) : view === 'cards' ? (
        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
              >
                <div className="aspect-[4/3] w-full bg-slate-900/40">
                  {r.imageUrl ? (
                    <div className="flex h-full w-full items-center justify-center bg-slate-900/40 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.imageUrl}
                        alt={r.name}
                        className="h-full w-full object-contain opacity-95"
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-slate-100">{r.name}</div>
                      <div className="mt-1 text-xs text-slate-500">Min: {r.min}</div>
                    </div>
                    <span className={badge(r.status)}>{r.status}</span>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qtd</div>
                      <div className="mt-1 text-3xl font-extrabold text-slate-100">{r.quantity}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-slate-400">Manual: {r.locked ? 'Sim' : 'Não'}</div>
                      <Link
                        href={`/admin/produtos/${r.id}/estoque`}
                        className="rounded-2xl bg-yellow-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-yellow-300"
                      >
                        Ajustar
                      </Link>
                    </div>
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
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Qtd</th>
                <th className="px-6 py-4">Mín</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Manual</th>
                <th className="px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-6 py-4 font-semibold text-slate-100">{r.name}</td>
                  <td className="px-6 py-4 text-slate-200">{r.quantity}</td>
                  <td className="px-6 py-4 text-slate-400">{r.min}</td>
                  <td className="px-6 py-4">
                    <span className={badge(r.status)}>{r.status}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{r.locked ? 'Sim' : 'Não'}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/produtos/${r.id}/estoque`}
                      className="font-semibold text-yellow-300 hover:text-yellow-200"
                    >
                      Ajustar
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
