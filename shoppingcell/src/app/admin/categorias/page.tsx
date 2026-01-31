import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { CategoriasClient } from '@/app/admin/categorias/CategoriasClient';

export const dynamic = 'force-dynamic';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort: number;
};

type ProductRow = {
  category_id: string | null;
};

export default async function CategoriasPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: rows, error }, { data: products, error: prodErr }] = await Promise.all([
    supabase
      .from('categories')
      .select('id,name,slug,sort')
      .order('sort', { ascending: true })
      .order('name', { ascending: true }),
    supabase.from('products').select('category_id'),
  ]);

  const counts = new Map<string, number>();
  for (const p of (products as ProductRow[] | null | undefined) ?? []) {
    if (!p.category_id) continue;
    counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Categorias"
        title="Categorias"
        subtitle="Gerencie as categorias do catálogo."
        actions={
          <Link
            href="/admin/categorias/nova"
            className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-yellow-300"
          >
            + Nova categoria
          </Link>
        }
      />

      {error || prodErr ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
          <div className="font-semibold">Erro ao carregar categorias</div>
          <div className="mt-2 opacity-90">{error?.message ?? prodErr?.message}</div>
          <div className="mt-3 text-xs text-red-200/80">
            Se ainda não aplicou o schema, rode: <code>supabase/admin_schema.sql</code>
          </div>
        </div>
      ) : (
        <CategoriasClient
          rows={((rows as CategoryRow[] | null | undefined) ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            sort: c.sort,
            productsCount: counts.get(c.id) || 0,
          }))}
        />
      )}
    </div>
  );
}
