import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import SyncButton from './SyncButton';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { ProdutosClient } from '@/app/admin/produtos/ProdutosClient';

export const dynamic = 'force-dynamic';

type MediaRow = {
  product_id: string;
  url: string;
};

export default async function ProdutosPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: products, error: productsError }, { data: categories }, { data: media, error: mediaErr }] =
    await Promise.all([
      supabase
        .from('products')
        .select('id,name,slug,price,active,category_id,created_at')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('id,name').order('sort', { ascending: true }),
      supabase.from('product_media').select('product_id,url').eq('is_primary', true),
    ]);

  const catNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const mediaByProductId = new Map(
    (media as MediaRow[] | null | undefined)?.map((m) => [m.product_id, m.url]) ?? [],
  );

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

      {productsError || mediaErr ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
          <div className="font-semibold">Erro ao carregar produtos</div>
          <div className="mt-2 opacity-90">{productsError?.message ?? mediaErr?.message}</div>
          <div className="mt-3 text-xs text-red-200/80">
            Se ainda não aplicou o schema, rode: <code>supabase/admin_schema.sql</code>
          </div>
        </div>
      ) : (
        <ProdutosClient
          products={(products ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            active: Boolean(p.active),
            categoryName: p.category_id ? (catNameById.get(p.category_id) ?? null) : null,
            imageUrl: mediaByProductId.get(p.id) ?? null,
          }))}
        />
      )}
    </div>
  );
}
