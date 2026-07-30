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
    sellerProfile?.display_name || (sale?.seller_id ? String(sale.seller_id).slice(0, 8) : 'Balcão / Sistema');

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-100 print:bg-white print:text-black">
      {/* Toolbar (hidden on print) */}
      <div className="print:hidden sticky top-0 z-10 border-b border-white/10 bg-neutral-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/pdv/vendas/${id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
            >
              <ArrowLeft size={15} /> Voltar à Venda
            </Link>
            <div className="hidden text-xs font-bold text-slate-400 sm:block">
              Comprovante Venda PDV (80mm)
            </div>
          </div>
          <PrintReceiptButton label="Imprimir Comprovante" />
        </div>
      </div>

      {/* Receipt Box (80mm) */}
      <div className="mx-auto w-full max-w-[380px] px-3 py-6 print:m-0 print:w-full print:max-w-none print:p-0">
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
            Erro ao carregar venda: {error.message}
          </div>
        ) : !sale ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
            Venda não encontrada.
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 font-mono text-[12px] leading-5 shadow-2xl print:border-none print:bg-white print:p-0 print:text-black print:shadow-none">
            <div className="text-center">
              <div className="text-[16px] font-black tracking-wider text-white print:text-black">
                SHOPPING CELL
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-400 print:text-black">
                Comprovante de Venda PDV
              </div>
              <div className="text-[10px] text-slate-500 print:text-black">
                Venda #{(sale.id || '').slice(0, 8)}
              </div>
            </div>

            <div className="my-3 border-t border-dashed border-white/20 print:border-black" />

            <div className="grid gap-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 print:text-black">Venda N°:</span>
                <span className="font-bold text-white print:text-black">
                  #{String(sale.id).slice(0, 8)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 print:text-black">Data/Hora:</span>
                <span className="font-bold text-white print:text-black">{createdAt}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 print:text-black">Vendedor:</span>
                <span className="font-bold text-white print:text-black">{sellerName}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 print:text-black">Cliente:</span>
                <span className="max-w-[200px] text-right font-bold text-white print:text-black">
                  {customer?.name || 'Cliente Geral (Balcão)'}
                </span>
              </div>
              {customer?.phone && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-400 print:text-black">WhatsApp:</span>
                  <span className="font-bold text-white print:text-black">{customer.phone}</span>
                </div>
              )}
            </div>

            <div className="my-3 border-t border-dashed border-white/20 print:border-black" />

            <div className="flex items-center justify-between text-[11px] font-black uppercase text-amber-400 print:text-black">
              <span>ITENS</span>
              <span>VALOR</span>
            </div>

            <div className="mt-2 grid gap-2.5">
              {(items ?? []).map((it: any) => (
                <div key={it.id} className="grid gap-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-100 print:text-black">
                      {it.products?.name ?? it.product_id ?? 'Produto'}
                    </span>
                    <span className="shrink-0 font-extrabold text-white print:text-black">
                      {money(it.total)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 print:text-black">
                    {it.products?.sheet_code ? `Cód: ${it.products.sheet_code} · ` : ''}
                    {it.quantity}x {money(it.unit_price)}
                    {Number(it.discount || 0) > 0 ? ` · desc ${money(it.discount)}` : ''}
                  </div>
                </div>
              ))}
            </div>

            <div className="my-3 border-t border-dashed border-white/20 print:border-black" />

            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 print:text-black">Forma de Pgto:</span>
                <span className="font-bold text-white print:text-black">
                  {pmLabel(sale.payment_method)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 print:text-black">Status:</span>
                <span className="font-bold text-white print:text-black">
                  {String(sale.status || 'CONCLUÍDA').toUpperCase()}
                </span>
              </div>

              <div className="my-2 border-t border-dashed border-white/20 print:border-black" />

              <div className="flex items-center justify-between">
                <span className="text-slate-400 print:text-black">Subtotal:</span>
                <span className="print:text-black">{money(sale.subtotal)}</span>
              </div>
              {Number(sale.discount_total || 0) > 0 && (
                <div className="flex items-center justify-between text-green-400 print:text-black">
                  <span>Desconto:</span>
                  <span>- {money(sale.discount_total)}</span>
                </div>
              )}
              <div className="mt-1 flex items-center justify-between text-[14px]">
                <span className="font-black text-white print:text-black">TOTAL:</span>
                <span className="font-black text-amber-400 print:text-black">{money(sale.total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 print:text-black">Valor Pago:</span>
                <span className="font-bold print:text-black">{money(sale.paid_amount)}</span>
              </div>

              {sale.payment_method === 'dinheiro' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 print:text-black">Recebido:</span>
                    <span className="print:text-black">{money((sale as any).received_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 print:text-black">Troco:</span>
                    <span className="font-bold text-green-400 print:text-black">
                      {money((sale as any).change_amount)}
                    </span>
                  </div>
                </>
              )}
            </div>

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
