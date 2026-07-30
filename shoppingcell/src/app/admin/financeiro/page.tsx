import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { FinanceiroClient } from '@/app/admin/financeiro/FinanceiroClient';

export const dynamic = 'force-dynamic';

export default async function FinanceiroPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: txs, error: txError },
    { data: payables, error: payablesError },
    { data: sales },
    { data: staffProfiles },
    { data: products },
    { data: inventory },
  ] = await Promise.all([
    supabase
      .from('finance_transactions')
      .select('id,type,category,description,amount,occurred_at,order_id')
      .order('occurred_at', { ascending: false })
      .limit(500),
    supabase
      .from('finance_payables')
      .select('id,status,category,description,amount,due_date,paid_at')
      .order('due_date', { ascending: true })
      .limit(500),
    supabase
      .from('sales')
      .select('id,created_at,total,subtotal,discount_total,seller_id,payment_method,status')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('staff_profiles')
      .select('user_id,display_name,role'),
    supabase
      .from('products')
      .select('id,name,price,cost_price'),
    supabase
      .from('inventory')
      .select('product_id,quantity'),
  ]);

  const isMissingPayables = Boolean(
    payablesError && /relation .*finance_payables.* does not exist/i.test(payablesError.message),
  );

  if (txError) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
        <div className="font-semibold">Erro ao carregar financeiro</div>
        <div className="mt-2 opacity-90">{txError.message}</div>
      </div>
    );
  }

  const invByProductId = new Map((inventory ?? []).map((i) => [i.product_id, i.quantity]));

  const productsInventory = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price || 0),
    cost_price: p.cost_price ? Number(p.cost_price) : null,
    quantity: Number(invByProductId.get(p.id) || 0),
  }));

  return (
    <FinanceiroClient
      txs={(txs as any) ?? []}
      payables={isMissingPayables ? [] : ((payables as any) ?? [])}
      sales={(sales as any) ?? []}
      staffProfiles={(staffProfiles as any) ?? []}
      productsInventory={productsInventory}
    />
  );
}
