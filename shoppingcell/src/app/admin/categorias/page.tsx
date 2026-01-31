import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function CategoriasPage() {
  const supabase = await createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from('categories')
    .select('id,name,slug,sort,created_at')
    .order('sort', { ascending: true })
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Categorias</h1>
          <p className="mt-1 text-sm text-slate-400">Gerencie as categorias do catálogo.</p>
        </div>
        <Link
          href="/admin/categorias/nova"
          className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
        >
          Nova categoria
        </Link>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
          <div className="font-semibold">Erro ao carregar categorias</div>
          <div className="mt-1 opacity-90">{error.message}</div>
          <div className="mt-3 text-xs text-red-200/80">
            Se ainda não aplicou o schema, rode o arquivo <code>supabase/admin_schema.sql</code> no SQL Editor do Supabase.
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full bg-slate-950 text-sm">
            <thead className="bg-slate-900/40 text-left text-slate-300">
              <tr>
                <th className="p-3">Nome</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Ordem</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((c) => (
                <tr key={c.id} className="border-t border-slate-800">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-slate-300">{c.slug}</td>
                  <td className="p-3 text-slate-300">{c.sort}</td>
                  <td className="p-3">
                    <Link href={`/admin/categorias/${c.id}`} className="text-yellow-400 hover:text-yellow-300">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
              {(rows ?? []).length === 0 && (
                <tr>
                  <td className="p-3 text-slate-400" colSpan={4}>
                    Nenhuma categoria cadastrada ainda.
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
