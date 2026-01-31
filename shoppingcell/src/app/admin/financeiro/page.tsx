import { createSupabaseServerClient } from '@/lib/supabaseServer';

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

  const income = (txs ?? []).filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount ?? 0), 0);
  const expense = (txs ?? []).filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount ?? 0), 0);
  const balance = income - expense;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Financeiro</h1>
        <p className="mt-1 text-sm text-slate-400">Entradas e saídas (MVP).</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-5 text-sm text-red-200">
          <div className="font-semibold">Erro ao carregar financeiro</div>
          <div className="mt-2 opacity-90">{error.message}</div>
          <div className="mt-3 text-xs text-red-200/80">
            Rode o SQL: <code>supabase/admin_patch_finance.sql</code>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-sm text-slate-400">Entradas</div>
              <div className="mt-1 text-2xl font-extrabold text-green-300">{money(income)}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-sm text-slate-400">Saídas</div>
              <div className="mt-1 text-2xl font-extrabold text-red-200">{money(expense)}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-sm text-slate-400">Saldo (simples)</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-200">{money(balance)}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/40 text-left text-slate-400">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Pedido</th>
                </tr>
              </thead>
              <tbody>
                {(txs ?? []).map((t: any) => (
                  <tr key={t.id} className="border-t border-slate-800">
                    <td className="p-3 text-slate-300">{new Date(t.occurred_at).toLocaleString('pt-BR')}</td>
                    <td className="p-3">
                      <span className={t.type === 'income' ? 'text-green-300' : 'text-red-200'}>
                        {t.type === 'income' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{t.category ?? '—'}</td>
                    <td className="p-3 text-slate-200">{t.description ?? '—'}</td>
                    <td className="p-3 font-semibold text-slate-200">{money(t.amount)}</td>
                    <td className="p-3 text-slate-400">{t.order_id ? String(t.order_id).slice(0, 8) : '—'}</td>
                  </tr>
                ))}
                {(txs ?? []).length === 0 && (
                  <tr>
                    <td className="p-3 text-slate-400" colSpan={6}>
                      Nenhuma movimentação ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
