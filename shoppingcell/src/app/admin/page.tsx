import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import DashboardCharts, { type DashboardDay } from './_components/DashboardCharts';

export const dynamic = 'force-dynamic';

function StatCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950 to-slate-950/40 p-5">
      <div className="text-sm text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-100">{value}</div>
      {hint && <div className="mt-2 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function money(n: number) {
  return `R$ ${n.toFixed(2)}`;
}

export default async function AdminHome() {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const today0 = startOfDay(now);

  const [
    { data: products },
    { data: inventory },
    { data: moves },
    { data: txs },
    { data: ordersConfirmedToday },
    { data: ordersConfirmed7 },
    { data: ordersConfirmed30 },
  ] = await Promise.all([
    supabase.from('products').select('id,active,price,cost_price,price_locked,cost_locked'),
    supabase.from('inventory').select('product_id,quantity,min_quantity,quantity_locked,min_locked'),
    supabase
      .from('inventory_moves')
      .select('id,product_id,delta,reason,created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('finance_transactions')
      .select('id,type,amount,occurred_at')
      .gte('occurred_at', since30.toISOString())
      .order('occurred_at', { ascending: true }),
    supabase
      .from('orders')
      .select('id,created_at')
      .eq('status', 'confirmed')
      .gte('created_at', today0.toISOString()),
    supabase
      .from('orders')
      .select('id,created_at')
      .eq('status', 'confirmed')
      .gte('created_at', since7.toISOString()),
    supabase
      .from('orders')
      .select('id,created_at')
      .eq('status', 'confirmed')
      .gte('created_at', since30.toISOString()),
  ]);

  const productCount = (products ?? []).length;
  const activeCount = (products ?? []).filter((p) => p.active).length;
  const totalQty = (inventory ?? []).reduce((acc, r: any) => acc + (r.quantity ?? 0), 0);

  const lowStock = (inventory ?? []).filter(
    (r: any) => (r.quantity ?? 0) > 0 && (r.quantity ?? 0) < (r.min_quantity ?? 0),
  ).length;
  const zeroStock = (inventory ?? []).filter((r: any) => (r.quantity ?? 0) <= 0).length;

  const withMargin = (products ?? []).filter((p: any) => p.price != null && p.cost_price != null);
  const avgMargin =
    withMargin.length === 0
      ? null
      : withMargin.reduce((acc: number, p: any) => acc + (Number(p.price) - Number(p.cost_price)), 0) /
        withMargin.length;

  const lockedCount = (products ?? []).filter((p: any) => p.price_locked || p.cost_locked).length;

  const incomeToday = (txs ?? [])
    .filter((t: any) => t.type === 'income' && new Date(t.occurred_at) >= today0)
    .reduce((acc: number, t: any) => acc + Number(t.amount ?? 0), 0);
  const expenseToday = (txs ?? [])
    .filter((t: any) => t.type === 'expense' && new Date(t.occurred_at) >= today0)
    .reduce((acc: number, t: any) => acc + Number(t.amount ?? 0), 0);

  const income7 = (txs ?? [])
    .filter((t: any) => t.type === 'income' && new Date(t.occurred_at) >= since7)
    .reduce((acc: number, t: any) => acc + Number(t.amount ?? 0), 0);

  // Build chart data (last 30 days)
  const days: DashboardDay[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = startOfDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
    days.push({ day: isoDay(d), income: 0, expense: 0, ordersConfirmed: 0 });
  }
  const byDay = new Map(days.map((x) => [x.day, x]));

  for (const t of txs ?? []) {
    const day = isoDay(startOfDay(new Date((t as any).occurred_at)));
    const target = byDay.get(day);
    if (!target) continue;
    const amt = Number((t as any).amount ?? 0);
    if ((t as any).type === 'income') target.income += amt;
    if ((t as any).type === 'expense') target.expense += amt;
  }

  for (const o of ordersConfirmed30 ?? []) {
    const day = isoDay(startOfDay(new Date((o as any).created_at)));
    const target = byDay.get(day);
    if (target) target.ordersConfirmed += 1;
  }

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
        <StatCard
          title="Caixa hoje"
          value={money(incomeToday - expenseToday)}
          hint={`Entradas: ${money(incomeToday)} • Saídas: ${money(expenseToday)}`}
        />
        <StatCard
          title="Vendas 7 dias"
          value={money(income7)}
          hint={`${(ordersConfirmed7 ?? []).length} pedidos confirmados`}
        />
        <StatCard
          title="Pedidos hoje"
          value={String((ordersConfirmedToday ?? []).length)}
          hint="Confirmados"
        />
        <StatCard
          title="Estoque"
          value={String(totalQty)}
          hint={`${zeroStock} zerados • ${lowStock} baixo`}
        />
      </div>

      <DashboardCharts data={days} />

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
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/30 p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-200">
                      {nameById.get(m.product_id) ?? m.product_id}
                    </div>
                    <div className="truncate text-xs text-slate-500">{m.reason ?? '—'}</div>
                  </div>
                  <div className="text-right">
                    <div
                      className={
                        m.delta > 0
                          ? 'text-sm font-semibold text-green-400'
                          : 'text-sm font-semibold text-red-300'
                      }
                    >
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(m.created_at).toLocaleString('pt-BR')}
                    </div>
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
              Ver lista de{' '}
              <Link className="font-semibold text-yellow-400 hover:text-yellow-300" href="/admin/estoque">
                baixo estoque
              </Link>
              .
            </li>
            <li>Editar preço/custo no produto trava automaticamente (manual vence a planilha).</li>
            <li>Próximo: relatórios de giro e ranking de produtos.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
