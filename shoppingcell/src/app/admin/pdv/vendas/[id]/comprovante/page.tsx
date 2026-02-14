import Link from 'next/link';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function money(n: number | null | undefined) {
  if (n == null) return '—';
  return `R$ ${Number(n).toFixed(2)}`;
}

function pmLabel(pm: string) {
  if (pm === 'pix') return 'PIX';
  if (pm === 'dinheiro') return 'Dinheiro';
  if (pm === 'fiado') return 'Fiado';
  return pm;
}

export default async function SaleReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: sale, error: saleErr }, { data: items, error: itemsErr }] = await Promise.all([
    supabase
      .from('sales')
      .select(
        'id,created_at,total,subtotal,discount_total,paid_amount,payment_method,status,customer_id,seller_id,received_amount,change_amount',
      )
      .eq('id', id)
      .single(),
    supabase
      .from('sale_items')
      .select('id,product_id,quantity,unit_price,discount,total, products(name,sheet_code)')
      .eq('sale_id', id)
      .order('created_at', { ascending: true }),
  ]);

  const [{ data: customer }, { data: sellerProfile }] = await Promise.all([
    sale?.customer_id
      ? supabase.from('customers').select('id,name,phone').eq('id', sale.customer_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
    sale?.seller_id
      ? supabase
          .from('staff_profiles')
          .select('user_id,display_name,role')
          .eq('user_id', sale.seller_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const error = saleErr || itemsErr;

  const createdAt = sale?.created_at ? new Date(sale.created_at).toLocaleString('pt-BR') : '—';
  const sellerName =
    sellerProfile?.display_name || (sale?.seller_id ? String(sale.seller_id).slice(0, 8) : '—');

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-100">
      {/* Toolbar (hidden on print) */}
      <div className="print:hidden sticky top-0 z-10 border-b border-white/10 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="text-sm font-extrabold">Comprovante</div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/pdv/vendas/${id}`}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10"
            >
              Voltar
            </Link>
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-yellow-300"
            >
              Imprimir / Salvar PDF
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            Erro: {error.message}
          </div>
        ) : !sale ? (
          <div className="text-sm text-slate-400">Venda não encontrada.</div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 print:border-none print:bg-transparent print:p-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-extrabold">SHOPPINGCELL</div>
                <div className="mt-1 text-xs text-slate-400">Comprovante de venda</div>
              </div>
              <div className="text-right text-xs text-slate-300">
                <div>Venda: {String(sale.id).slice(0, 8)}</div>
                <div>Data: {createdAt}</div>
              </div>
            </div>

            <div className="my-4 h-px bg-white/10" />

            {/* Customer */}
            <div className="grid gap-1 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-400">Cliente</span>
                <span className="font-bold">{customer?.name || '—'}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-400">WhatsApp</span>
                <span className="font-bold">{customer?.phone || '—'}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-400">Vendedor</span>
                <span className="font-bold">{sellerName}</span>
              </div>
            </div>

            <div className="my-4 h-px bg-white/10" />

            {/* Items */}
            <div>
              <div className="text-sm font-extrabold">Itens</div>
              <div className="mt-3 grid gap-2">
                {(items ?? []).map((it: any) => (
                  <div
                    key={it.id}
                    className="rounded-2xl border border-white/10 bg-neutral-950/40 p-4 print:border-none print:bg-transparent print:p-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold">
                          {it.products?.name ?? it.product_id}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {it.products?.sheet_code ? `Código: ${it.products.sheet_code} • ` : ''}
                          {it.quantity}x • {money(it.unit_price)} • desc {money(it.discount)}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-extrabold text-yellow-300">{money(it.total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="my-4 h-px bg-white/10" />

            {/* Summary */}
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Pagamento</span>
                <span className="font-bold">{pmLabel(sale.payment_method)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <span className="font-bold">{String(sale.status || '').toUpperCase()}</span>
              </div>

              <div className="mt-2 h-px bg-white/10" />

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Subtotal</span>
                <span>{money(sale.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Desconto</span>
                <span>{money(sale.discount_total)}</span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="font-extrabold">TOTAL</span>
                <span className="font-extrabold text-yellow-300">{money(sale.total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Pago</span>
                <span>{money(sale.paid_amount)}</span>
              </div>

              {sale.payment_method === 'dinheiro' ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Recebido</span>
                    <span>{money((sale as any).received_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Troco</span>
                    <span>{money((sale as any).change_amount)}</span>
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-6 text-center text-xs text-slate-500">Obrigado pela preferência.</div>

            <style>{`
              @media print {
                body { background: white !important; }
                .print\\:hidden { display: none !important; }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
