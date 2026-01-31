import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Panel } from '@/app/admin/_components/ui/Panel';

export const dynamic = 'force-dynamic';

function money(n: number | null | undefined) {
  if (n == null) return '—';
  const v = Number(n);
  return `R$ ${v.toFixed(2)}`;
}

export default async function FinanceiroPage() {
  const supabase = await createSupabaseServerClient();

  const { data: txs, error } = await supabase
    .from('finance_transactions')
    .select('id,type,category,description,amount,occurred_at,order_id,created_at')
    .order('occurred_at', { ascending: false })
    .limit(200);

  const income = (txs ?? [])
    .filter((t: any) => t.type === 'income')
    .reduce((a: number, t: any) => a + Number(t.amount ?? 0), 0);
  const expense = (txs ?? [])
    .filter((t: any) => t.type === 'expense')
    .reduce((a: number, t: any) => a + Number(t.amount ?? 0), 0);
  const balance = income - expense;

  return (
    <div className="grid gap-6">
      <PageHeader kicker="Financeiro" title="Financeiro" subtitle="Gestão de fluxo de caixa (MVP)." />

      {error ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
          <div className="font-semibold">Erro ao carregar financeiro</div>
          <div className="mt-2 opacity-90">{error.message}</div>
          <div className="mt-3 text-xs text-red-200/80">
            Rode o SQL: <code>supabase/admin_patch_finance.sql</code>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entradas</div>
              <div className="mt-2 text-3xl font-extrabold text-green-300">{money(income)}</div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saídas</div>
              <div className="mt-2 text-3xl font-extrabold text-red-200">{money(expense)}</div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo</div>
              <div className="mt-2 text-3xl font-extrabold text-slate-100">{money(balance)}</div>
            </div>
          </div>

          <Panel>
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-200">Transações</div>
                <div className="text-xs text-slate-400">{(txs ?? []).length} exibidas</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Pedido</th>
                  </tr>
                </thead>
                <tbody>
                  {(txs ?? []).map((t: any) => (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-6 py-4 text-slate-300">
                        {new Date(t.occurred_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            'rounded-full px-3 py-1 text-xs font-semibold ' +
                            (t.type === 'income'
                              ? 'bg-green-500/15 text-green-300'
                              : 'bg-red-500/15 text-red-200')
                          }
                        >
                          {t.type === 'income' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{t.category ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-200">{t.description ?? '—'}</td>
                      <td className="px-6 py-4 font-semibold text-slate-100">{money(t.amount)}</td>
                      <td className="px-6 py-4 text-slate-400">
                        {t.order_id ? String(t.order_id).slice(0, 8) : '—'}
                      </td>
                    </tr>
                  ))}
                  {(txs ?? []).length === 0 && (
                    <tr>
                      <td className="px-6 py-10 text-slate-400" colSpan={6}>
                        Nenhuma movimentação ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
