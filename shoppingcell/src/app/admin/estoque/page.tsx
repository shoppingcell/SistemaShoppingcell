import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { EstoqueClient } from '@/app/admin/estoque/EstoqueClient';
import { EstoqueCharts } from '@/app/admin/estoque/EstoqueCharts';

export const dynamic = 'force-dynamic';

type InvRow = {
  product_id: string;
  quantity: number;
  min_quantity?: number;
  quantity_locked?: boolean;
  min_locked?: boolean;
};

type MediaRow = {
  product_id: string;
  url: string;
};

export default async function EstoquePage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: inv, error: invErr }, { data: prods, error: prodErr }, { data: media, error: mediaErr }] =
    await Promise.all([
      supabase.from('inventory').select('product_id,quantity,min_quantity,quantity_locked,min_locked'),
      supabase.from('products').select('id,name,slug').order('name', { ascending: true }),
      supabase.from('product_media').select('product_id,url').eq('is_primary', true),
    ]);

  if (invErr || prodErr || mediaErr) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
        <div className="font-semibold">Erro ao carregar estoque</div>
        <div className="mt-2 opacity-90">{invErr?.message ?? prodErr?.message ?? mediaErr?.message}</div>
      </div>
    );
  }

  const invById = new Map((inv as InvRow[] | null | undefined)?.map((r) => [r.product_id, r]) ?? []);
  const mediaByProductId = new Map(
    (media as MediaRow[] | null | undefined)?.map((m) => [m.product_id, m.url]) ?? [],
  );

  const rows = (prods ?? []).map((p) => {
    const r = invById.get(p.id);
    const quantity = r?.quantity ?? 0;
    const min = (r as any)?.min_quantity ?? 0;
    const status = quantity <= 0 ? 'Zerado' : quantity < min ? 'Baixo' : 'OK';
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      quantity,
      min,
      status,
      locked: Boolean((r as any)?.quantity_locked || (r as any)?.min_locked),
      imageUrl: mediaByProductId.get(p.id) ?? null,
    };
  });

  return (
    <div className="grid gap-6">
      <PageHeader kicker="Estoque" title="Estoque" subtitle="Visão geral (cards + tabela)." />

      <EstoqueCharts rows={rows as any} />
      <EstoqueClient rows={rows as any} />
    </div>
  );
}
