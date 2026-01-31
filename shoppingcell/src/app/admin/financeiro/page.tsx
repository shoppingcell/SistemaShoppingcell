import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { FinanceiroClient } from '@/app/admin/financeiro/FinanceiroClient';

export const dynamic = 'force-dynamic';

export default async function FinanceiroPage() {
  const supabase = await createSupabaseServerClient();

  const { data: txs, error: txError } = await supabase
    .from('finance_transactions')
    .select('id,type,category,description,amount,occurred_at,order_id')
    .order('occurred_at', { ascending: false })
    .limit(300);

  const { data: payables, error: payablesError } = await supabase
    .from('finance_payables')
    .select('id,status,category,description,amount,due_date,paid_at')
    .order('due_date', { ascending: true })
    .limit(300);

  // If payables table isn't created yet, we still render, but with empty list.
  const isMissingPayables = Boolean(
    payablesError && /relation .*finance_payables.* does not exist/i.test(payablesError.message),
  );

  if (txError) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
        <div className="font-semibold">Erro ao carregar financeiro</div>
        <div className="mt-2 opacity-90">{txError.message}</div>
        <div className="mt-3 text-xs text-red-200/80">
          Rode o SQL: <code>supabase/admin_patch_finance.sql</code>
        </div>
      </div>
    );
  }

  if (payablesError && !isMissingPayables) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
        <div className="font-semibold">Erro ao carregar contas a pagar</div>
        <div className="mt-2 opacity-90">{payablesError.message}</div>
        <div className="mt-3 text-xs text-red-200/80">
          Rode o SQL: <code>supabase/admin_patch_finance_payables.sql</code>
        </div>
      </div>
    );
  }

  return (
    <FinanceiroClient
      txs={(txs as any) ?? []}
      payables={isMissingPayables ? [] : ((payables as any) ?? [])}
    />
  );
}
