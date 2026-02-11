import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { FiadoClient } from './ui/FiadoClient';

export const dynamic = 'force-dynamic';

export default async function FiadoPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: receivables, error: rErr }, { data: customers }] = await Promise.all([
    supabase
      .from('receivables')
      .select('id,sale_id,customer_id,total,paid,status,due_date,created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('customers').select('id,name,phone').limit(5000),
  ]);

  const customerById = new Map((customers ?? []).map((c: any) => [c.id, c]));
  const rows = (receivables ?? []).map((r: any) => ({
    ...r,
    customer: customerById.get(r.customer_id) ?? null,
  }));

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Fiado"
        title="Fiado"
        subtitle="Contas a receber (aberto/parcial/atrasado/quitado)."
      />

      <Panel>
        {rErr ? (
          <div className="p-6 text-sm text-red-200">Erro: {rErr.message}</div>
        ) : (
          <FiadoClient rows={rows as any} />
        )}
      </Panel>
    </div>
  );
}
