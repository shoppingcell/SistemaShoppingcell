import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import SyncButton from './SyncButton';

export const dynamic = 'force-dynamic';

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
    <div>
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-extrabold">Produtos</h1>
          <p className="mt-1 text-sm text-slate-400">Gerencie produtos, mídia e estoque.</p>
        </div>
        <div className="flex items-center gap-3">
          <SyncButton />
          <Link
            href="/admin/produtos/novo"
            className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
          >
            Novo produto
          </Link>
        </div>
      </div>

      {productsError ? (
        <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
          <div className="font-semibold">Erro ao carregar produtos</div>
          <div className="mt-1 opacity-90">{productsError.message}</div>
          <div className="mt-3 text-xs text-red-200/80">
            Se ainda não aplicou o schema, rode o arquivo <code>supabase/admin_schema.sql</code> no SQL Editor do Supabase.
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full bg-slate-950 text-sm">
            <thead className="bg-slate-900/40 text-left text-slate-400">
              <tr>
                <th className="p-3">Nome</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Status</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((p) => (
                <tr key={p.id} className="border-t border-slate-800">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-slate-300">{p.category_id ? catNameById.get(p.category_id) : '—'}</td>
                  <td className="p-3 text-slate-300">{p.price != null ? `R$ ${Number(p.price).toFixed(2)}` : '—'}</td>
                  <td className="p-3 text-slate-300">{p.active ? 'Ativo' : 'Inativo'}</td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <Link href={`/admin/produtos/${p.id}`} className="text-yellow-400 hover:text-yellow-300">
                        Editar
                      </Link>
                      <Link href={`/admin/produtos/${p.id}/midia`} className="text-slate-200 hover:text-white">
                        Mídia
                      </Link>
                      <Link href={`/admin/produtos/${p.id}/estoque`} className="text-slate-200 hover:text-white">
                        Estoque
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {(products ?? []).length === 0 && (
                <tr>
                  <td className="p-3 text-slate-400" colSpan={5}>
                    Nenhum produto cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
