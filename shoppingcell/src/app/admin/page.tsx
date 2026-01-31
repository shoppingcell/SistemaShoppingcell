import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function StatCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="text-sm text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
      {hint && <div className="mt-2 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export default async function AdminHome() {
  const supabase = await createSupabaseServerClient();

  const [{ data: products }, { data: inventory }, { data: moves }] = await Promise.all([
    supabase.from('products').select('id,active,price,cost_price,price_locked,cost_locked'),
    supabase.from('inventory').select('product_id,quantity,min_quantity,quantity_locked,min_locked'),
    supabase
      .from('inventory_moves')
      .select('id,product_id,delta,reason,created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const productCount = (products ?? []).length;
  const activeCount = (products ?? []).filter((p) => p.active).length;
  const totalQty = (inventory ?? []).reduce((acc, r: any) => acc + (r.quantity ?? 0), 0);

  const lowStock = (inventory ?? []).filter((r: any) => (r.quantity ?? 0) > 0 && (r.quantity ?? 0) < (r.min_quantity ?? 0)).length;
  const zeroStock = (inventory ?? []).filter((r: any) => (r.quantity ?? 0) <= 0).length;

  const withMargin = (products ?? []).filter((p: any) => p.price != null && p.cost_price != null);
  const avgMargin =
    withMargin.length === 0
      ? null
      : withMargin.reduce((acc: number, p: any) => acc + (Number(p.price) - Number(p.cost_price)), 0) / withMargin.length;

  const lockedCount = (products ?? []).filter((p: any) => p.price_locked || p.cost_locked).length;

  const { data: prodNames } = await supabase.from('products').select('id,name');
  const nameById = new Map((prodNames ?? []).map((p) => [p.id, p.name]));

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-extrabold">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Visão geral do catálogo e estoque.</p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/produtos"
            className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
          >
            Ver produtos
          </Link>
          <Link
            href="/admin/categorias"
            className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
          >
            Ver categorias
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Produtos" value={String(productCount)} hint={`${activeCount} ativos`} />
        <StatCard title="Itens em estoque" value={String(totalQty)} hint={`${zeroStock} zerados`} />
        <StatCard title="Baixo estoque" value={String(lowStock)} />
        <StatCard title="Margem média" value={avgMargin == null ? '—' : `R$ ${avgMargin.toFixed(2)}`} hint={`${lockedCount} manuais`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Atividades recentes</div>
            <Link href="/admin/produtos" className="text-xs text-slate-400 hover:text-white">
              Ver tudo
            </Link>
          </div>
          <div className="mt-4 grid gap-2">
            {(moves ?? []).length === 0 ? (
              <div className="text-sm text-slate-500">Nenhuma movimentação ainda.</div>
            ) : (
              (moves ?? []).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-200">{nameById.get(m.product_id) ?? m.product_id}</div>
                    <div className="truncate text-xs text-slate-500">{m.reason ?? '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className={m.delta > 0 ? 'text-sm font-semibold text-green-400' : 'text-sm font-semibold text-red-300'}>
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </div>
                    <div className="text-xs text-slate-500">{new Date(m.created_at).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="text-sm font-semibold">Ações rápidas</div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-300">
            <li>
              Ver lista de <Link className="font-semibold text-yellow-400 hover:text-yellow-300" href="/admin/estoque">baixo estoque</Link>.
            </li>
            <li>Editar preço/custo no produto trava automaticamente (manual vence a planilha).</li>
            <li>Próximo: relatórios de giro e ranking de produtos.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
