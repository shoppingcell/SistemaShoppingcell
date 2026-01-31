import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { RhClient } from '@/app/admin/rh/RhClient';

export const dynamic = 'force-dynamic';

export default async function RhPage() {
  const supabase = await createSupabaseServerClient();

  const { data: employees, error: empErr } = await supabase
    .from('hr_employees')
    .select('id,name,role,salary,hired_at,status')
    .order('created_at', { ascending: false })
    .limit(300);

  const { data: payments, error: payErr } = await supabase
    .from('hr_payments')
    .select('id,employee_id,description,amount,paid_at')
    .order('paid_at', { ascending: false })
    .limit(300);

  const missingEmployees = Boolean(
    empErr && /relation .*hr_employees.* does not exist/i.test(empErr.message),
  );
  const missingPayments = Boolean(payErr && /relation .*hr_payments.* does not exist/i.test(payErr.message));

  // If tables aren't created yet, we render UI anyway with empty lists.
  if (empErr && !missingEmployees) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
        <div className="font-semibold">Erro ao carregar RH (funcionários)</div>
        <div className="mt-2 opacity-90">{empErr.message}</div>
        <div className="mt-3 text-xs text-red-200/80">
          Rode o SQL: <code>supabase/admin_patch_hr.sql</code>
        </div>
      </div>
    );
  }

  if (payErr && !missingPayments) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
        <div className="font-semibold">Erro ao carregar RH (pagamentos)</div>
        <div className="mt-2 opacity-90">{payErr.message}</div>
        <div className="mt-3 text-xs text-red-200/80">
          Rode o SQL: <code>supabase/admin_patch_hr.sql</code>
        </div>
      </div>
    );
  }

  return (
    <RhClient
      employees={missingEmployees ? [] : ((employees as any) ?? [])}
      payments={missingPayments ? [] : ((payments as any) ?? [])}
    />
  );
}
