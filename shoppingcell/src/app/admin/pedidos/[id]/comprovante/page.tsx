import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PrintReceiptButton } from '@/app/admin/_components/ui/PrintReceiptButton';

export const dynamic = 'force-dynamic';

function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return 'R$ 0.00';
  return `R$ ${Number(n).toFixed(2)}`;
}

function pmLabel(pm: string | null | undefined) {
  if (!pm) return '—';
  if (pm === 'pix') return 'PIX';
  if (pm === 'dinheiro') return 'Dinheiro';
  if (pm === 'cartao') return 'Cartão de Crédito/Débito';
  if (pm === 'fiado') return 'Fiado / Prazo';
  return pm;
}

export default async function OrderReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: order, error: orderErr }, { data: items, error: itemsErr }] = await Promise.all([
    supabase
      .from('orders')
      .select(
        'id,created_at,status,payment_status,payment_method,customer_name,customer_phone,notes, customers(name,phone)',
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

  const customerName = customerRel?.name || order?.customer_name || 'Cliente Geral';
  const customerPhone = customerRel?.phone || order?.customer_phone || '—';

  const subtotal = (items ?? []).reduce(
    (acc: number, it: any) => acc + Number(it.price ?? 0) * Number(it.quantity ?? 0),
    0,
  );
  const total = Number((order as any)?.total ?? subtotal ?? 0);
  const discount = Math.max(0, subtotal - total);

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-100 print:bg-white print:text-black">
      {/* Action Toolbar (hidden on paper print) */}
      <div className="print:hidden sticky top-0 z-10 border-b border-white/10 bg-neutral-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/pedidos/${id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
            >
              <ArrowLeft size={15} /> Voltar ao Pedido
            </Link>
            <div className="hidden text-xs font-bold text-slate-400 sm:block">
              Comprovante Térmico (80mm)
            </div>
          </div>
          <PrintReceiptButton label="Imprimir Comprovante" />
        </div>
      </div>

      {/* Thermal Receipt Box (80mm width) */}
      <div className="mx-auto w-full max-w-[380px] px-3 py-6 print:m-0 print:w-full print:max-w-none print:p-0">
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
            Erro ao carregar pedido: {error.message}
          </div>
        ) : !order ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
            Pedido não encontrado ou removido.
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 font-mono text-[12px] leading-5 shadow-2xl print:border-none print:bg-white print:p-0 print:text-black print:shadow-none">
            {/* Store Header */}
            <div className="text-center">
              <div className="text-[16px] font-black tracking-wider text-white print:text-black">
                SHOPPING CELL
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-400 print:text-black">
                Peças e Assistência Técnica
              </div>
              <div className="text-[10px] text-slate-500 print:text-black">
                Comprovante de Pedido #{(order.id || '').slice(0, 8)}
              </div>
            </div>

            <div className="my-3 border-t border-dashed border-white/20 print:border-black" />

            {/* Order Details */}
            <div className="grid gap-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 print:text-black">Pedido N°:</span>
                <span className="font-bold text-white print:text-black">
                  #{String(order.id).slice(0, 8)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 print:text-black">Data/Hora:</span>
                <span className="font-bold text-white print:text-black">{createdAt}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 print:text-black">Cliente:</span>
                <span className="max-w-[200px] text-right font-bold text-white print:text-black">
                  {customerName}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 print:text-black">WhatsApp:</span>
                <span className="font-bold text-white print:text-black">{customerPhone}</span>
              </div>
            </div>

            <div className="my-3 border-t border-dashed border-white/20 print:border-black" />

            {/* Item List Header */}
            <div className="flex items-center justify-between text-[11px] font-black uppercase text-amber-400 print:text-black">
              <span>ITENS DO PEDIDO</span>
              <span>VALOR</span>
            </div>

            <div className="mt-2 grid gap-2.5">
              {(items ?? []).map((it: any) => (
                <div key={it.id} className="grid gap-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-100 print:text-black">
                      {it.products?.name ?? it.product_id ?? 'Produto sem nome'}
                    </span>
                    <span className="shrink-0 font-extrabold text-white print:text-black">
                      {money(it.total != null ? it.total : Number(it.quantity ?? 0) * Number(it.price ?? 0))}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 print:text-black">
                    {it.products?.sheet_code ? `Cód: ${it.products.sheet_code} · ` : ''}
                    {it.quantity}x {money(it.price)}
                  </div>
                </div>
              ))}
            </div>

            <div className="my-3 border-t border-dashed border-white/20 print:border-black" />

            {/* Order Totals & Payment Summary */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 print:text-black">Status Pedido:</span>
                <span className="font-bold text-white print:text-black">
                  {String(order.status || 'Pendente').toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 print:text-black">Status Pgto:</span>
                <span className="font-bold text-white print:text-black">
                  {String((order as any).payment_status || 'Pendente').toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 print:text-black">Forma de Pgto:</span>
                <span className="font-bold text-white print:text-black">
                  {pmLabel((order as any).payment_method)}
                </span>
              </div>

              <div className="my-2 border-t border-dashed border-white/20 print:border-black" />

              <div className="flex items-center justify-between">
                <span className="text-slate-400 print:text-black">Subtotal:</span>
                <span className="print:text-black">{money(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-green-400 print:text-black">
                  <span>Desconto:</span>
                  <span>- {money(discount)}</span>
                </div>
              )}
              <div className="mt-1 flex items-center justify-between text-[14px]">
                <span className="font-black text-white print:text-black">TOTAL:</span>
                <span className="font-black text-amber-400 print:text-black">{money(total)}</span>
              </div>
            </div>

            {order?.notes ? (
              <>
                <div className="my-3 border-t border-dashed border-white/20 print:border-black" />
                <div className="text-[11px] font-bold text-slate-400 print:text-black">Observações:</div>
                <div className="mt-0.5 text-[11px] text-slate-200 print:text-black">{String(order.notes)}</div>
              </>
            ) : null}

            <div className="my-3 border-t border-dashed border-white/20 print:border-black" />

            <div className="text-center text-[10px] text-slate-400 print:text-black">
              Obrigado pela preferência!
              <br />
              Shopping Cell • www.shoppingcell.tech
            </div>

            {/* Print Styles */}
            <style>{`
              @page {
                size: 80mm auto;
                margin: 3mm;
              }
              @media print {
                html, body {
                  background: white !important;
                  color: black !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .print\\:hidden {
                  display: none !important;
                }
                * {
                  color-adjust: exact !important;
                  -webkit-print-color-adjust: exact !important;
                  color: black !important;
                  background: transparent !important;
                  box-shadow: none !important;
                }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
