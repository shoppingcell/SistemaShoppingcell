import Link from 'next/link';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { PdvClient } from './pdvClient';

export const dynamic = 'force-dynamic';

export default async function PdvPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: products }, { data: inventory }] = await Promise.all([
    supabase
      .from('products')
      .select('id,name,slug,price,sheet_code,barcode,active')
      .eq('active', true)
      .order('name', { ascending: true })
      .limit(2000),
    supabase.from('inventory').select('product_id,quantity').limit(5000),
  ]);

  const invById = new Map((inventory ?? []).map((r: any) => [r.product_id, Number(r.quantity ?? 0)]));

  const rows = (products ?? []).map((p: any) => ({
    ...p,
    quantity: invById.get(p.id) ?? 0,
  }));

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="PDV"
        title="PDV (Balcão)"
        subtitle="Venda rápida com baixa de estoque. PIX, Dinheiro e Fiado."
        actions={
          <Link
            href="/admin/pdv/vendas"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white hover:bg-white/10"
          >
            Ver vendas
          </Link>
        }
      />
      <PdvClient products={rows as any} />
    </div>
  );
}
