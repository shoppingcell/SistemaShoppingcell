import { NextResponse } from 'next/server';

import { writeBackStockByCode } from '@/lib/googleSheetsStock';
import { requireAdminOrActiveStaff } from '@/lib/requireAdmin';
import { createSupabaseServiceClient } from '@/lib/supabaseService';

type ConfirmationResult = {
  ok: boolean;
  already?: boolean;
  confirmed?: boolean;
  adjustments?: Array<{ product_id: string; requested: number; applied: number }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_order_id' }, { status: 400 });
  }

  const gate = await requireAdminOrActiveStaff();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc('confirm_order_atomic', {
    p_order_id: id,
    p_user_id: gate.user.id,
  });

  if (error) {
    const status = error.code === 'P0002' ? 404 : error.message.includes('order_has_no_valid_items') ? 400 : 500;
    const publicError =
      status === 404 ? 'order_not_found' : status === 400 ? 'order_has_no_valid_items' : 'order_confirmation_failed';
    return NextResponse.json({ ok: false, error: publicError }, { status });
  }

  const confirmation = (data ?? { ok: true, confirmed: true }) as ConfirmationResult;
  if (confirmation.already) {
    return NextResponse.json(confirmation);
  }

  // The transactional confirmation is already committed. Sheets write-back is
  // deliberately best-effort and cannot leave the database partially updated.
  try {
    const { data: items, error: itemsError } = await service
      .from('order_items')
      .select('product_id')
      .eq('order_id', id);
    if (itemsError) throw itemsError;

    const productIds = Array.from(new Set((items ?? []).map((item) => item.product_id).filter(Boolean))) as string[];
    if (productIds.length === 0) {
      return NextResponse.json({ ...confirmation, sheet: { ok: true, skipped: true } });
    }

    const [{ data: products, error: productsError }, { data: inventory, error: inventoryError }] =
      await Promise.all([
        service.from('products').select('id,sheet_code').in('id', productIds),
        service.from('inventory').select('product_id,quantity').in('product_id', productIds),
      ]);
    if (productsError) throw productsError;
    if (inventoryError) throw inventoryError;

    const quantityByProduct = new Map((inventory ?? []).map((row) => [row.product_id, Number(row.quantity ?? 0)]));
    const payload = (products ?? [])
      .map((product) => {
        const code = String(product.sheet_code ?? '').trim();
        const stock = quantityByProduct.get(product.id);
        return code && stock != null ? { code, stock } : null;
      })
      .filter((row): row is { code: string; stock: number } => row !== null);

    const sheet = await writeBackStockByCode(payload);
    return NextResponse.json({ ...confirmation, sheet });
  } catch {
    return NextResponse.json({
      ...confirmation,
      sheet: { ok: false, error: 'sheet_writeback_failed' },
    });
  }
}
