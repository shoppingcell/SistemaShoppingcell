import Link from 'next/link';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Panel } from '@/app/admin/_components/ui/Panel';

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

export default async function SaleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: sale, error: saleErr }, { data: items, error: itemsErr }] = await Promise.all([
    supabase
      .from('sales')
      .select('id,created_at,total,subtotal,discount_total,paid_amount,payment_method,status, customer_id')
      .eq('id', id)
      .single(),
    supabase
      .from('sale_items')
      .select('id,product_id,quantity,unit_price,discount,total, products(name)')
      .eq('sale_id', id)
      .order('created_at', { ascending: true }),
  ]);

  const error = saleErr || itemsErr;

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="PDV"
        title="Detalhes da venda"
        subtitle={`ID: ${String(id).slice(0, 8)}`}
        backHref="/admin/pdv/vendas"
        actions={
          <Link
            href="/admin/pdv"
            className="rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-yellow-300"
          >
            Nova venda
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-sm font-semibold text-slate-200">Itens</div>
          </div>

          {error ? (
            <div className="p-6 text-sm text-red-200">Erro: {error.message}</div>
          ) : (
            <div className="px-6 py-5">
              <div className="grid gap-2">
                {(items ?? []).map((it: any) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-slate-100">
                        {it.products?.name ?? it.product_id}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {it.quantity}x • {money(it.unit_price)} • desc {money(it.discount)}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-extrabold text-yellow-300">{money(it.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel>
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-sm font-semibold text-slate-200">Resumo</div>
          </div>

          <div className="px-6 py-5">
            {sale ? (
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Data</span>
                  <span className="text-slate-200">{new Date(sale.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Pagamento</span>
                  <span className="text-slate-200">{pmLabel(sale.payment_method)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className="text-slate-200">{String(sale.status || '').toUpperCase()}</span>
                </div>

                <div className="mt-2 h-px bg-white/10" />

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-200">{money(sale.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Desc total</span>
                  <span className="text-slate-200">{money(sale.discount_total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-200">TOTAL</span>
                  <span className="text-yellow-300 font-extrabold">{money(sale.total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Recebido</span>
                  <span className="text-slate-200">{money(sale.paid_amount)}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Venda não encontrada.</div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
