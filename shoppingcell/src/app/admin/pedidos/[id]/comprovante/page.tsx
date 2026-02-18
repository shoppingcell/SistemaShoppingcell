import Link from 'next/link';

import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function money(n: number | null | undefined) {
  if (n == null) return '—';
  return `R$ ${Number(n).toFixed(2)}`;
}

function pmLabel(pm: string | null | undefined) {
  if (!pm) return '—';
  if (pm === 'pix') return 'PIX';
  if (pm === 'dinheiro') return 'Dinheiro';
  if (pm === 'cartao') return 'Cartão';
  if (pm === 'fiado') return 'Fiado';
  return pm;
}

export default async function OrderReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: order, error: orderErr }, { data: items, error: itemsErr }] = await Promise.all([
    supabase
      .from('orders')
      .select(
        'id,created_at,total,status,payment_status,payment_method,customer_name,customer_phone,notes, customers(name,phone)',
      )
      .eq('id', id)
      .single(),
    supabase
      .from('order_items')
      .select('id,product_id,quantity,price,total, products(name,sheet_code)')
      .eq('order_id', id)
      .order('created_at', { ascending: true }),
  ]);

  const error = orderErr || itemsErr;

  const createdAt = order?.created_at ? new Date(order.created_at).toLocaleString('pt-BR') : '—';
  const customerRel = Array.isArray((order as any)?.customers)
    ? (order as any).customers[0]
    : (order as any)?.customers;

  const customerName = customerRel?.name || order?.customer_name || '—';
  const customerPhone = customerRel?.phone || order?.customer_phone || '—';

  const subtotal = (items ?? []).reduce(
    (acc: number, it: any) => acc + Number(it.price ?? 0) * Number(it.quantity ?? 0),
    0,
  );
  const total = Number(order?.total ?? subtotal ?? 0);
  const discount = Math.max(0, subtotal - total);

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-100">
      <div className="print:hidden sticky top-0 z-10 border-b border-white/10 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="text-sm font-extrabold">Comprovante Pedido (80mm)</div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/pedidos/${id}`}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10"
            >
              Voltar
            </Link>
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-yellow-300"
            >
              Imprimir
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[360px] px-3 py-5 print:p-0">
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            Erro: {error.message}
          </div>
        ) : !order ? (
          <div className="text-sm text-slate-400">Pedido não encontrado.</div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-[12px] leading-5 print:border-none print:bg-transparent print:text-black">
            <div className="text-center">
              <div className="text-[14px] font-extrabold tracking-wide">SHOPPINGCELL</div>
              <div className="text-[11px] text-slate-400 print:text-black/70">Comprovante de pedido</div>
            </div>

            <div className="my-3 border-t border-dashed border-white/15 print:border-black/40" />

            <div className="grid gap-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 print:text-black/70">Pedido</span>
                <span className="font-bold">{String(order.id).slice(0, 8)}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 print:text-black/70">Data</span>
                <span className="font-bold">{createdAt}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 print:text-black/70">Cliente</span>
                <span className="max-w-[210px] text-right font-bold">{customerName}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 print:text-black/70">WhatsApp</span>
                <span className="font-bold">{customerPhone}</span>
              </div>
            </div>

            <div className="my-3 border-t border-dashed border-white/15 print:border-black/40" />

            <div className="text-[12px] font-extrabold">ITENS</div>

            <div className="mt-2 grid gap-2">
              {(items ?? []).map((it: any) => (
                <div key={it.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-bold">{it.products?.name ?? it.product_id}</div>
                      <div className="text-[11px] text-slate-400 print:text-black/70">
                        {it.products?.sheet_code ? `Cód: ${it.products.sheet_code} · ` : ''}
                        {it.quantity}x {money(it.price)}
                      </div>
                    </div>
                    <div className="shrink-0 font-extrabold">
                      {money(it.total != null ? it.total : Number(it.quantity ?? 0) * Number(it.price ?? 0))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="my-3 border-t border-dashed border-white/15 print:border-black/40" />

            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 print:text-black/70">Status pedido</span>
                <span className="font-bold">{String(order.status || '').toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 print:text-black/70">Status pgto</span>
                <span className="font-bold">{String(order.payment_status || '').toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 print:text-black/70">Forma pgto</span>
                <span className="font-bold">{pmLabel((order as any).payment_method)}</span>
              </div>

              <div className="my-2 border-t border-dashed border-white/15 print:border-black/40" />

              <div className="flex items-center justify-between">
                <span className="text-slate-400 print:text-black/70">Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 print:text-black/70">Desconto</span>
                <span>{money(discount)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-extrabold">TOTAL</span>
                <span className="font-extrabold">{money(total)}</span>
              </div>
            </div>

            {order?.notes ? (
              <>
                <div className="my-3 border-t border-dashed border-white/15 print:border-black/40" />
                <div className="text-[11px] text-slate-400 print:text-black/70">Observações</div>
                <div className="text-[12px]">{String(order.notes)}</div>
              </>
            ) : null}

            <div className="mt-4 text-center text-[11px] text-slate-400 print:text-black/70">
              Obrigado pela preferência.
            </div>

            <style>{`
              @page {
                size: 80mm auto;
                margin: 4mm;
              }

              @media print {
                html, body { background: white !important; }
                .print\\:hidden { display: none !important; }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
