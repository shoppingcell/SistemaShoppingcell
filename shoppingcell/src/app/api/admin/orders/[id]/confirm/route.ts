import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createSupabaseServiceClient } from '@/lib/supabaseService';
import { writeBackStockByCode } from '@/lib/googleSheetsStock';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const { requireAdminOrActiveStaff } = await import('@/lib/requireAdmin');
  const gate = await requireAdminOrActiveStaff();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const user = { id: gate.user.id };

  const service = createSupabaseServiceClient();

  // Load order + items
  const { data: order, error: oErr } = await service.from('orders').select('*').eq('id', id).single();
  if (oErr) return NextResponse.json({ ok: false, error: oErr.message }, { status: 500 });

  if (!order) return NextResponse.json({ ok: false, error: 'order_not_found' }, { status: 404 });
  if (order.status === 'confirmed') return NextResponse.json({ ok: true, already: true });

  const { data: items, error: iErr } = await service.from('order_items').select('*').eq('order_id', id);
  if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });

  const productIds = (items ?? []).map((x: any) => x.product_id);
  const { data: products, error: pErr } = await service
    .from('products')
    .select('id,sheet_code')
    .in('id', productIds);
  if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });

  const sheetCodeByProductId = new Map((products ?? []).map((p: any) => [p.id, (p.sheet_code || '').trim()]));

  // Ensure inventory rows exist
  if (productIds.length) {
    const { data: invExisting } = await service
      .from('inventory')
      .select('product_id')
      .in('product_id', productIds);
    const existing = new Set((invExisting ?? []).map((r: any) => r.product_id));
    const missing = productIds.filter((pid: string) => !existing.has(pid));
    if (missing.length) {
      const { error: invInsErr } = await service
        .from('inventory')
        .insert(missing.map((product_id: string) => ({ product_id, quantity: 0, min_quantity: 0 })) as any);
      if (invInsErr) return NextResponse.json({ ok: false, error: invInsErr.message }, { status: 500 });
    }
  }

  // Read current quantities
  const { data: invRows, error: invErr } = await service
    .from('inventory')
    .select('product_id,quantity')
    .in('product_id', productIds);
  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

  const qtyByProductId = new Map((invRows ?? []).map((r: any) => [r.product_id, Number(r.quantity ?? 0)]));

  // Apply moves + update inventory (auto-adjust to available stock)
  const now = new Date().toISOString();
  const invUpdates: any[] = [];
  const moves: any[] = [];
  const itemAdjustments: Array<{ product_id: string; requested: number; applied: number }> = [];
  const itemUpdates: any[] = [];
  const itemDeletes: string[] = [];

  for (const it of items ?? []) {
    const pid = (it as any).product_id;
    const q = Number((it as any).quantity ?? 0);
    if (!pid || !Number.isFinite(q) || q <= 0) continue;

    const current = qtyByProductId.get(pid) ?? 0;
    const applied = Math.max(0, Math.min(q, current));

    if (applied !== q) {
      itemAdjustments.push({ product_id: pid, requested: q, applied });
      if (applied <= 0) {
        itemDeletes.push((it as any).id);
      } else {
        itemUpdates.push({ id: (it as any).id, quantity: applied, updated_at: now });
      }
    }

    if (applied <= 0) continue;

    const next = current - applied;
    qtyByProductId.set(pid, next);

    invUpdates.push({ product_id: pid, quantity: next, updated_at: now });
    moves.push({
      product_id: pid,
      user_id: user.id,
      delta: -applied,
      reason: `order_confirm:${id}`,
    });
  }

  // Persist item adjustments (best-effort)
  if (itemUpdates.length) {
    const results = await Promise.all(
      itemUpdates.map((u) => service.from('order_items').update({ quantity: u.quantity }).eq('id', u.id)),
    );
    const firstErr = results.find((r) => r.error)?.error;
    if (firstErr) return NextResponse.json({ ok: false, error: firstErr.message }, { status: 500 });
  }
  if (itemDeletes.length) {
    const { error: delErr } = await service.from('order_items').delete().in('id', itemDeletes);
    if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
  }

  if (moves.length) {
    const { error: mvErr } = await service.from('inventory_moves').insert(moves as any);
    if (mvErr) return NextResponse.json({ ok: false, error: mvErr.message }, { status: 500 });
  }

  if (invUpdates.length) {
    const { error: updErr } = await service
      .from('inventory')
      .upsert(invUpdates, { onConflict: 'product_id' });
    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  // Update order status
  const { error: stErr } = await service.from('orders').update({ status: 'confirmed' }).eq('id', id);
  if (stErr) return NextResponse.json({ ok: false, error: stErr.message }, { status: 500 });

  // Finance: record revenue (best-effort, but should usually succeed)
  try {
    const { data: finalItems } = await service
      .from('order_items')
      .select('price,quantity')
      .eq('order_id', id);

    const total = (finalItems ?? []).reduce(
      (acc: number, it: any) => acc + Number(it.price ?? 0) * Number(it.quantity ?? 0),
      0,
    );

    await service.from('finance_transactions').insert({
      type: 'income',
      category: 'Vendas',
      description: `Pedido ${String(id).slice(0, 8)}`,
      amount: total,
      occurred_at: now,
      order_id: id,
    } as any);
  } catch {
    // ignore
  }

  // Write-back to Google Sheets (best-effort)
  try {
    const payload = (items ?? [])
      .map((it: any) => {
        const code = sheetCodeByProductId.get(it.product_id) || '';
        const stock = qtyByProductId.get(it.product_id);
        return code && stock != null ? { code, stock } : null;
      })
      .filter(Boolean) as Array<{ code: string; stock: number }>;

    const wb = await writeBackStockByCode(payload);

    return NextResponse.json({ ok: true, confirmed: true, sheet: wb });
  } catch (e: any) {
    // order is confirmed even if sheet fails
    return NextResponse.json({
      ok: true,
      confirmed: true,
      sheet: { ok: false, error: e?.message || String(e) },
    });
  }
}
