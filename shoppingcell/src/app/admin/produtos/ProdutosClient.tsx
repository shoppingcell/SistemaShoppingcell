'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { EmptyState } from '@/app/admin/_components/ui/EmptyState';

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  active: boolean;
  categoryName: string | null;
  imageUrl?: string | null;
};

function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `R$ ${Number(n).toFixed(2)}`;
}

export function ProdutosClient({ products }: { products: ProductRow[] }) {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return products
      .filter((p) => {
        if (!qq) return true;
        return (
          p.name.toLowerCase().includes(qq) ||
          p.slug.toLowerCase().includes(qq) ||
          (p.categoryName || '').toLowerCase().includes(qq)
        );
      })
      .filter((p) => {
        if (status === 'all') return true;
        if (status === 'active') return p.active;
        return !p.active;
      });
  }, [products, q, status]);

  return (
    <Panel>
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-200">Produtos</div>
            <div className="mt-1 text-xs text-slate-400">{filtered.length} exibidos</div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, categoria, slug…"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-yellow-500/40 focus:outline-none sm:w-80"
            />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatus('all')}
                className={
                  'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                  (status === 'all'
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                }
              >
                Todos
              </button>
              <button
                onClick={() => setStatus('active')}
                className={
                  'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                  (status === 'active'
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                }
              >
                Ativos
              </button>
              <button
                onClick={() => setStatus('inactive')}
                className={
                  'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                  (status === 'inactive'
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                }
              >
                Inativos
              </button>
            </div>

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
        <EmptyState
          title="Nenhum produto encontrado"
          description="Tente outro termo de busca ou ajuste os filtros."
        />
      ) : view === 'cards' ? (
        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
              >
                <div className="aspect-[4/3] w-full bg-slate-900/40">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover opacity-95" />
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
                      <div className="truncate text-sm font-extrabold text-slate-100">{p.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{p.categoryName || '—'}</div>
                    </div>

                    <span
                      className={
                        'rounded-full px-3 py-1 text-xs font-semibold ' +
                        (p.active ? 'bg-green-500/15 text-green-300' : 'bg-white/10 text-slate-200')
                      }
                    >
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Preço
                      </div>
                      <div className="mt-1 text-2xl font-extrabold text-slate-100">{money(p.price)}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Link
                        href={`/admin/produtos/${p.id}`}
                        className="rounded-2xl bg-yellow-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-yellow-300"
                      >
                        Editar
                      </Link>
                      <div className="flex gap-3 text-xs">
                        <Link
                          href={`/admin/produtos/${p.id}/midia`}
                          className="font-semibold text-slate-200 hover:text-white"
                        >
                          Mídia
                        </Link>
                        <Link
                          href={`/admin/produtos/${p.id}/estoque`}
                          className="font-semibold text-slate-200 hover:text-white"
                        >
                          Estoque
                        </Link>
                      </div>
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
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Preço</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-6 py-4 font-semibold text-slate-100">{p.name}</td>
                  <td className="px-6 py-4 text-slate-300">{p.categoryName || '—'}</td>
                  <td className="px-6 py-4 text-slate-300">{money(p.price)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={
                        'rounded-full px-3 py-1 text-xs font-semibold ' +
                        (p.active ? 'bg-green-500/15 text-green-300' : 'bg-white/10 text-slate-200')
                      }
                    >
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      <Link
                        href={`/admin/produtos/${p.id}`}
                        className="font-semibold text-yellow-300 hover:text-yellow-200"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/admin/produtos/${p.id}/midia`}
                        className="font-semibold text-slate-200 hover:text-white"
                      >
                        Mídia
                      </Link>
                      <Link
                        href={`/admin/produtos/${p.id}/estoque`}
                        className="font-semibold text-slate-200 hover:text-white"
                      >
                        Estoque
                      </Link>
                    </div>
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
