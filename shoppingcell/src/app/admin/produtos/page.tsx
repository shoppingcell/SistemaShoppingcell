import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import SyncButton from './SyncButton';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { EmptyState } from '@/app/admin/_components/ui/EmptyState';

export const dynamic = 'force-dynamic';

function money(n: number | null | undefined) {
  if (n == null) return '—';
  return `R$ ${Number(n).toFixed(2)}`;
}

export default async function ProdutosPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: products, error: productsError }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('id,name,slug,price,active,category_id,created_at')
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('id,name').order('sort', { ascending: true }),
  ]);

  const catNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Produtos"
        title="Produtos"
        subtitle="Catálogo de peças e acessórios."
        actions={
          <>
            <SyncButton />
            <Link
              href="/admin/produtos/novo"
              className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-yellow-300"
            >
              + Novo Produto
            </Link>
          </>
        }
      />

      {productsError ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
          <div className="font-semibold">Erro ao carregar produtos</div>
          <div className="mt-2 opacity-90">{productsError.message}</div>
          <div className="mt-3 text-xs text-red-200/80">
            Se ainda não aplicou o schema, rode: <code>supabase/admin_schema.sql</code>
          </div>
        </div>
      ) : (
        <Panel>
          <div className="border-b border-white/10 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">Produtos</div>
              <div className="text-xs text-slate-400">{(products ?? []).length} cadastrados</div>
            </div>
          </div>

          {(products ?? []).length === 0 ? (
            <EmptyState
              title="Nenhum produto encontrado"
              description="Comece sincronizando com a planilha ou adicionando manualmente."
              action={
                <Link
                  href="/admin/produtos/novo"
                  className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-yellow-300"
                >
                  + Adicionar Produto
                </Link>
              }
            />
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
                  {(products ?? []).map((p: any) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-6 py-4 font-semibold text-slate-100">{p.name}</td>
                      <td className="px-6 py-4 text-slate-300">
                        {p.category_id ? catNameById.get(p.category_id) : '—'}
                      </td>
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
      )}
    </div>
  );
}
