import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { PedidosCharts, type OrdersDay } from '@/app/admin/pedidos/PedidosCharts';
import { PedidosClient } from '@/app/admin/pedidos/PedidosClient';

export const dynamic = 'force-dynamic';

export default async function PedidosPage() {
  const supabase = await createSupabaseServerClient();

  // payment_status is optional (may not exist yet until patch is applied)
  let orders: any[] | null = null;
  let error: any = null;

  const attempt = await supabase
    .from('orders')
    .select(
      'id,status,payment_status,customer_name,customer_phone,customer_id,created_at,customers(name,phone)',
    )
    .order('created_at', { ascending: false })
    .limit(80);

  if (attempt.error && /column .*payment_status.* does not exist/i.test(attempt.error.message)) {
    const fallback = await supabase
      .from('orders')
      .select('id,status,customer_name,customer_phone,customer_id,created_at,customers(name,phone)')
      .order('created_at', { ascending: false })
      .limit(80);
    orders = (fallback.data as any) ?? [];
    error = fallback.error;
  } else {
    orders = (attempt.data as any) ?? [];
    error = attempt.error;
  }

  // Build chart data (last 30 days)
  const now = new Date();
  const days: OrdersDay[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const iso = d.toISOString().slice(0, 10);
    days.push({ day: iso, drafts: 0, sent: 0, confirmed: 0 });
  }
  const byDay = new Map(days.map((x) => [x.day, x]));

  for (const o of orders ?? []) {
    const iso = new Date((o as any).created_at).toISOString().slice(0, 10);
    const bucket = byDay.get(iso);
    if (!bucket) continue;
    if ((o as any).status === 'draft') bucket.drafts += 1;
    if ((o as any).status === 'sent') bucket.sent += 1;
    if ((o as any).status === 'confirmed') bucket.confirmed += 1;
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Pedidos"
        title="Pedidos"
        subtitle="Gestão de vendas atacado (B2B)."
        actions={
          <Link
            href="/admin/pedidos/novo"
            className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-yellow-300"
          >
            + Novo Pedido
          </Link>
        }
      />

      {error ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
          <div className="font-semibold">Erro ao carregar pedidos</div>
          <div className="mt-2 opacity-90">{error.message}</div>
        </div>
      ) : (
        <div className="grid gap-4">
          <PedidosCharts data={days} />

          <PedidosClient orders={(orders ?? []).map((o: any) => ({
            id: o.id,
            status: o.status,
            payment_status: o.payment_status,
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            customers: o.customers,
            created_at: o.created_at,
          }))} />
        </div>
      )}
    </div>
  );
}
