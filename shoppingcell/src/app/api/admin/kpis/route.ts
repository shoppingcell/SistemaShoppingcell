import { NextResponse } from 'next/server';

import { requireAdminOrActiveStaff } from '@/lib/requireAdmin';
import { createSupabaseServiceClient } from '@/lib/supabaseService';

export async function GET() {
  const gate = await requireAdminOrActiveStaff();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [products, customers, ordersToday, inventory] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', start.toISOString()),
      supabase.from('inventory').select('quantity'),
    ]);

    const firstError = products.error ?? customers.error ?? ordersToday.error ?? inventory.error;
    if (firstError) {
      return NextResponse.json({ ok: false, error: 'kpi_query_failed' }, { status: 502 });
    }

    const inventoryTotal = (inventory.data ?? []).reduce(
      (sum, row) => sum + Number(row.quantity ?? 0),
      0,
    );

    return NextResponse.json({
      ok: true,
      productsCount: products.count ?? 0,
      customersCount: customers.count ?? 0,
      ordersTodayCount: ordersToday.count ?? 0,
      inventoryTotal,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'kpi_unavailable' }, { status: 500 });
  }
}
