import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { FiadoClient } from './ui/FiadoClient';

export const dynamic = 'force-dynamic';

export default async function FiadoPage() {
  const supabase = await createSupabaseServerClient();

  const { data: receivables, error: rErr } = await supabase
    .from('receivables')
    .select(
      'id,sale_id,customer_id,total,paid,status,due_date,created_at, customer:customers(id,name,phone,is_walkin)',
    )
    .order('created_at', { ascending: false })
    .limit(300);

  const rows = (receivables ?? []).map((r: any) => ({
    ...r,
    customer: (r as any).customer ?? null,
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
