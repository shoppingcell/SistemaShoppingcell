import Link from 'next/link';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { PdvClient } from './pdvClient';

export const dynamic = 'force-dynamic';

type MediaRow = { product_id: string; url: string; is_primary: boolean; sort: number };

export default async function PdvPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: products },
    { data: inventory },
    { data: categories },
    { data: media },
    { data: customers },
    { data: recentSales },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('id,name,slug,price,sheet_code,barcode,active,category_id')
      .eq('active', true)
      .order('name', { ascending: true })
      .limit(2000),
    supabase.from('inventory').select('product_id,quantity,min_quantity').limit(5000),
    supabase.from('categories').select('id,name').order('name', { ascending: true }),
    supabase
      .from('product_media')
      .select('product_id,url,is_primary,sort')
      .order('is_primary', { ascending: false })
      .order('sort', { ascending: true }),
    supabase
      .from('customers')
      .select('id,name,phone,is_walkin')
      .eq('active', true)
      .order('name', { ascending: true })
      .limit(500),
    supabase
      .from('sales')
      .select('id,total,status,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const invById = new Map(
    (inventory ?? []).map((row: any) => [
      row.product_id,
      { quantity: Number(row.quantity ?? 0), minQuantity: Number(row.min_quantity ?? 0) },
    ]),
  );
  const categoryById = new Map((categories ?? []).map((row: any) => [row.id, row.name]));
  const mediaByProductId = new Map<string, string>();
  for (const item of (media as MediaRow[] | null) ?? []) {
    if (!mediaByProductId.has(item.product_id)) mediaByProductId.set(item.product_id, item.url);
  }

  const rows = (products ?? []).map((product: any) => {
    const stock = invById.get(product.id) ?? { quantity: 0, minQuantity: 0 };
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price ?? 0),
      sheet_code: product.sheet_code ?? null,
      barcode: product.barcode ?? null,
      active: Boolean(product.active),
      quantity: stock.quantity,
      minQuantity: stock.minQuantity,
      categoryName: product.category_id ? categoryById.get(product.category_id) ?? null : null,
      mediaUrl: mediaByProductId.get(product.id) ?? null,
    };
  });

  const validSales = (recentSales ?? []).filter((sale: any) => sale.status !== 'cancelled');
  const metrics = {
    recentSales: validSales.length,
    recentTotal: validSales.reduce((sum: number, sale: any) => sum + Number(sale.total ?? 0), 0),
    lowStock: rows.filter((row) => row.quantity > 0 && row.quantity <= row.minQuantity).length,
    outOfStock: rows.filter((row) => row.quantity <= 0).length,
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        kicker="Operação de balcão"
        title="PDV ShoppingCell"
        subtitle="Venda rápida, estoque em tempo real e finalização segura."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/pdv/vendas"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-white/10"
            >
              Histórico de vendas
            </Link>
            <Link
              href="/admin/fiado"
              className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2.5 text-xs font-extrabold text-yellow-200 hover:bg-yellow-400/15"
            >
              Contas a receber
            </Link>
          </div>
        }
      />
      <PdvClient
        products={rows}
        customers={(customers ?? []).map((customer: any) => ({
          id: customer.id,
          name: customer.name || 'Cliente sem nome',
          phone: customer.phone ?? null,
          isWalkin: Boolean(customer.is_walkin),
        }))}
        metrics={metrics}
      />
    </div>
  );
}
