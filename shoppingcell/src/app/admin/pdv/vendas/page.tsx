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

export default async function PdvSalesPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sales, error } = await supabase
    .from('sales')
    .select('id,created_at,total,payment_method,status,paid_amount')
    .order('created_at', { ascending: false })
    .limit(80);

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="PDV"
        title="Vendas"
        subtitle="Últimas vendas registradas."
        backHref="/admin/pdv"
        actions={
          <Link
            href="/admin/pdv"
            className="rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-yellow-300"
          >
            Nova venda
          </Link>
        }
      />

      <Panel>
        <div className="border-b border-white/10 px-6 py-5">
          <div className="text-sm font-semibold text-slate-200">Histórico</div>
          <div className="mt-1 text-xs text-slate-500">Usuário: {user?.email ?? '—'}</div>
        </div>

        {error ? (
          <div className="p-6 text-sm text-red-200">Erro: {error.message}</div>
        ) : (sales?.length ?? 0) === 0 ? (
          <div className="p-6 text-sm text-slate-400">Nenhuma venda ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Pagamento</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Recebido</th>
                  <th className="px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sales!.map((s: any) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4 text-slate-200">
                      {new Date(s.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-slate-200">{pmLabel(s.payment_method)}</td>
                    <td className="px-6 py-4 text-slate-300">{String(s.status || '').toUpperCase()}</td>
                    <td className="px-6 py-4 font-extrabold text-yellow-300">{money(s.total)}</td>
                    <td className="px-6 py-4 text-slate-200">{money(s.paid_amount)}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/pdv/vendas/${s.id}`}
                        className="font-semibold text-yellow-200 hover:text-yellow-100"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
