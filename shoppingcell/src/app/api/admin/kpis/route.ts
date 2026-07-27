import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabaseService';

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();

    const [{ count: productsCount }, { count: customersCount }] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
    ]);

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const { count: ordersTodayCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start.toISOString());

    // inventory total items
    const { data: inventoryRows } = await supabase.from('inventory').select('quantity');
    const inventoryTotal = Array.isArray(inventoryRows)
      ? inventoryRows.reduce((s, r: any) => s + (r.quantity || 0), 0)
      : 0;

    return NextResponse.json({ productsCount: productsCount || 0, customersCount: customersCount || 0, ordersTodayCount: ordersTodayCount || 0, inventoryTotal });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
