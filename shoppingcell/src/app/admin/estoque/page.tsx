import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { EmptyState } from '@/app/admin/_components/ui/EmptyState';

export const dynamic = 'force-dynamic';

type InvRow = {
  product_id: string;
  quantity: number;
  min_quantity?: number;
  quantity_locked?: boolean;
  min_locked?: boolean;
};

function badge(status: string) {
  const base = 'rounded-full px-3 py-1 text-xs font-semibold';
  if (status === 'OK') return `${base} bg-green-500/15 text-green-300`;
  if (status === 'Zerado') return `${base} bg-red-500/15 text-red-200`;
  return `${base} bg-yellow-400/15 text-yellow-200`;
}

export default async function EstoquePage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: inv, error: invErr }, { data: prods, error: prodErr }] = await Promise.all([
    supabase.from('inventory').select('product_id,quantity,min_quantity,quantity_locked,min_locked'),
    supabase.from('products').select('id,name,slug').order('name', { ascending: true }),
  ]);

  if (invErr || prodErr) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
        <div className="font-semibold">Erro ao carregar estoque</div>
        <div className="mt-2 opacity-90">{invErr?.message ?? prodErr?.message}</div>
      </div>
    );
  }

  const invById = new Map((inv as InvRow[] | null | undefined)?.map((r) => [r.product_id, r]) ?? []);

  const rows = (prods ?? []).map((p) => {
    const r = invById.get(p.id);
    const quantity = r?.quantity ?? 0;
    const min = (r as any)?.min_quantity ?? 0;
    const status = quantity <= 0 ? 'Zerado' : quantity < min ? 'Baixo' : 'OK';
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      quantity,
      min,
      status,
      locked: Boolean((r as any)?.quantity_locked || (r as any)?.min_locked),
    };
  });

  const low = rows.filter((r) => r.status === 'Baixo').length;
  const zero = rows.filter((r) => r.status === 'Zerado').length;

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Estoque"
        title="Estoque"
        subtitle="Visão geral (baixo estoque, zerado e ajustes manuais)."
        actions={
          <div className="flex gap-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200">
              Baixo: {low}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200">
              Zerado: {zero}
            </div>
          </div>
        }
      />

      <Panel>
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-200">Itens</div>
            <div className="text-xs text-slate-400">{rows.length} produtos</div>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="Sem produtos" description="Sincronize a planilha para começar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4">Produto</th>
                  <th className="px-6 py-4">Qtd</th>
                  <th className="px-6 py-4">Mín</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Manual</th>
                  <th className="px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4 font-semibold text-slate-100">{r.name}</td>
                    <td className="px-6 py-4 text-slate-200">{r.quantity}</td>
                    <td className="px-6 py-4 text-slate-400">{r.min}</td>
                    <td className="px-6 py-4">
                      <span className={badge(r.status)}>{r.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{r.locked ? 'Sim' : 'Não'}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/produtos/${r.id}/estoque`}
                        className="font-semibold text-yellow-300 hover:text-yellow-200"
                      >
                        Ajustar
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
