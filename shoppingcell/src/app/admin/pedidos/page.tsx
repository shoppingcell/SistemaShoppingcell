import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function PedidosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id,status,customer_name,customer_phone,customer_id,created_at,customers(name,phone)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-extrabold">Pedidos</h1>
          <p className="mt-1 text-sm text-slate-400">Crie pedidos e envie pelo WhatsApp (B2B).</p>
        </div>
        <Link
          href="/admin/pedidos/novo"
          className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
        >
          Novo pedido
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-5 text-sm text-red-200">
          <div className="font-semibold">Erro ao carregar pedidos</div>
          <div className="mt-2 opacity-90">{error.message}</div>
          <div className="mt-3 text-xs text-red-200/80">
            Rode o SQL: <code>supabase/admin_patch_orders.sql</code>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/40 text-left text-slate-400">
              <tr>
                <th className="p-3">Status</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">Criado</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((o) => (
                <tr key={o.id} className="border-t border-slate-800">
                  <td className="p-3 text-slate-200">{o.status}</td>
                  <td className="p-3 text-slate-200">
                    {(o as any).customers?.name ?? o.customer_name ?? '—'}
                  </td>
                  <td className="p-3 text-slate-400">
                    {(o as any).customers?.phone ?? o.customer_phone ?? '—'}
                  </td>
                  <td className="p-3 text-slate-400">{new Date(o.created_at).toLocaleString('pt-BR')}</td>
                  <td className="p-3">
                    <Link href={`/admin/pedidos/${o.id}`} className="text-yellow-400 hover:text-yellow-300">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {(orders ?? []).length === 0 && (
                <tr>
                  <td className="p-3 text-slate-400" colSpan={5}>
                    Nenhum pedido ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
