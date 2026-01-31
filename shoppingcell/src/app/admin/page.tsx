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
    supabase.from('products').select('id,active'),
    supabase.from('inventory').select('product_id,quantity'),
    supabase
      .from('inventory_moves')
      .select('id,product_id,delta,reason,created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const productCount = (products ?? []).length;
  const activeCount = (products ?? []).filter((p) => p.active).length;
  const totalQty = (inventory ?? []).reduce((acc, r) => acc + (r.quantity ?? 0), 0);

  // We'll compute low stock once min_quantity is stored. For now show 0.
  const lowStock = 0;

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
        <StatCard title="Itens em estoque" value={String(totalQty)} />
        <StatCard title="Baixo estoque" value={String(lowStock)} hint="(depende do estoque mínimo)" />
        <StatCard title="Movimentações" value={String((moves ?? []).length)} hint="últimas registradas" />
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
          <div className="text-sm font-semibold">Próximos passos</div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-300">
            <li>Guardar <span className="font-semibold">Preço de Custo</span> e <span className="font-semibold">Estoque mínimo</span> vindos da planilha.</li>
            <li>Dashboard com <span className="font-semibold">Baixo estoque</span> real.</li>
            <li>Relatórios: margem, giro, top produtos.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
