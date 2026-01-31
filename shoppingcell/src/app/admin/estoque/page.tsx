import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

type InvRow = {
  product_id: string;
  quantity: number;
  min_quantity?: number;
  quantity_locked?: boolean;
  min_locked?: boolean;
};

export default async function EstoquePage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: inv, error: invErr }, { data: prods, error: prodErr }] = await Promise.all([
    supabase.from('inventory').select('product_id,quantity,min_quantity,quantity_locked,min_locked'),
    supabase.from('products').select('id,name,slug').order('name', { ascending: true }),
  ]);

  if (invErr || prodErr) {
    return (
      <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-5 text-sm text-red-200">
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
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-extrabold">Estoque</h1>
          <p className="mt-1 text-sm text-slate-400">Visão geral (baixo estoque, zerado e ajustes manuais).</p>
        </div>

        <div className="flex gap-3 text-sm">
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-slate-200">Baixo: {low}</div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-slate-200">Zerado: {zero}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/40 text-left text-slate-400">
            <tr>
              <th className="p-3">Produto</th>
              <th className="p-3">Qtd</th>
              <th className="p-3">Mín</th>
              <th className="p-3">Status</th>
              <th className="p-3">Manual</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-slate-200">{r.quantity}</td>
                <td className="p-3 text-slate-400">{r.min}</td>
                <td className="p-3">
                  <span
                    className={
                      'rounded-full px-2 py-1 text-xs font-semibold ' +
                      (r.status === 'OK'
                        ? 'bg-green-950/40 text-green-300'
                        : r.status === 'Zerado'
                          ? 'bg-red-950/40 text-red-200'
                          : 'bg-yellow-950/40 text-yellow-200')
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td className="p-3 text-slate-400">{r.locked ? 'Sim' : 'Não'}</td>
                <td className="p-3">
                  <Link href={`/admin/produtos/${r.id}/estoque`} className="text-yellow-400 hover:text-yellow-300">
                    Ajustar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
