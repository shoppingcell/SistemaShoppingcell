import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { ArrowUpRight, Boxes, ClipboardList, DollarSign } from 'lucide-react';
import DashboardCharts, { type DashboardDay } from './_components/DashboardCharts';
import { InventoryStatusMini } from './_components/InventoryStatusMini';
import PremiumCard from './_components/PremiumCard';
import StockGauge from './_components/StockGauge';

export const dynamic = 'force-dynamic';

function StatCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute -top-24 left-10 h-48 w-48 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-100">{value}</div>
          {hint && <div className="mt-2 text-xs text-slate-500">{hint}</div>}
        </div>
        {icon && (
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-yellow-300">
            {icon}
          </div>
        )}
      </div>
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

  const stockRows = (inventory ?? []).filter((r: any) => Number(r.min_quantity ?? 0) > 0);
  const stockHealth =
    stockRows.length === 0
      ? 100
      : Math.round(
          (stockRows.filter((r: any) => Number(r.quantity ?? 0) >= Number(r.min_quantity ?? 0)).length /
            stockRows.length) *
            100,
        );

  const lowStock = (inventory ?? []).filter(
    (r: any) => (r.quantity ?? 0) > 0 && (r.quantity ?? 0) < (r.min_quantity ?? 0),
  ).length;
  const zeroStock = (inventory ?? []).filter((r: any) => (r.quantity ?? 0) <= 0).length;
  const okStock = Math.max(0, (inventory ?? []).length - lowStock - zeroStock);

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
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overview</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Visão geral (dia é o principal).</p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/produtos"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Ver produtos <ArrowUpRight size={16} />
          </Link>
          <Link
            href="/admin/categorias"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Ver categorias <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Caixa hoje"
          value={money(incomeToday - expenseToday)}
          hint={`Entradas: ${money(incomeToday)} • Saídas: ${money(expenseToday)}`}
          icon={<DollarSign size={18} />}
        />
        <StatCard
          title="Vendas 7 dias"
          value={money(income7)}
          hint={`${(ordersConfirmed7 ?? []).length} pedidos confirmados`}
          icon={<ArrowUpRight size={18} />}
        />
        <StatCard
          title="Pedidos hoje"
          value={String((ordersConfirmedToday ?? []).length)}
          hint="Confirmados"
          icon={<ClipboardList size={18} />}
        />
        <StatCard
          title="Estoque"
          value={String(totalQty)}
          hint={`${zeroStock} zerados • ${lowStock} baixo`}
          icon={<Boxes size={18} />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <DashboardCharts data={days} />
        </div>
        <PremiumCard title="Stock Health" right={<span className="text-yellow-300">{stockHealth}%</span>}>
          <StockGauge value={stockHealth} />
        </PremiumCard>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PremiumCard
          title="Status do estoque"
          right={
            <Link href="/admin/estoque" className="text-xs text-slate-400 hover:text-white">
              Ver estoque
            </Link>
          }
        >
          <InventoryStatusMini ok={okStock} low={lowStock} zero={zeroStock} />
        </PremiumCard>

        <PremiumCard
          title="Saúde de margem"
          right={
            <Link href="/admin/produtos" className="text-xs text-slate-400 hover:text-white">
              Ver produtos
            </Link>
          }
        >
          <div className="mt-1 grid gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Produtos cadastrados
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-100">{productCount}</div>
              <div className="mt-1 text-xs text-slate-500">Ativos: {activeCount}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Margem média (preço - custo)
              </div>
              <div className="mt-2 text-2xl font-extrabold text-slate-100">
                {avgMargin == null ? '—' : money(avgMargin)}
              </div>
              <div className="mt-1 text-xs text-slate-500">Itens travados manual: {lockedCount}</div>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard title="Atalhos">
          <ul className="mt-1 list-disc space-y-2 pl-5 text-sm text-slate-300">
            <li>
              Ver lista de{' '}
              <Link className="font-semibold text-yellow-300 hover:text-yellow-200" href="/admin/estoque">
                baixo estoque
              </Link>
              .
            </li>
            <li>
              <Link className="font-semibold text-yellow-300 hover:text-yellow-200" href="/admin/pedidos">
                Pedidos
              </Link>{' '}
              e marcação de pagamento.
            </li>
            <li>
              <Link className="font-semibold text-yellow-300 hover:text-yellow-200" href="/admin/financeiro">
                Financeiro
              </Link>{' '}
              (entradas/saídas/contas a pagar).
            </li>
          </ul>
        </PremiumCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PremiumCard
          title="Atividades recentes"
          right={
            <Link href="/admin/produtos" className="text-xs text-slate-400 hover:text-white">
              Ver tudo
            </Link>
          }
        >
          <div className="mt-1 grid gap-2">
            {(moves ?? []).length === 0 ? (
              <div className="text-sm text-slate-500">Nenhuma movimentação ainda.</div>
            ) : (
              (moves ?? []).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">
                      {nameById.get(m.product_id) ?? m.product_id}
                    </div>
                    <div className="truncate text-xs text-slate-400">{m.reason ?? '—'}</div>
                  </div>
                  <div className="text-right">
                    <div
                      className={
                        m.delta > 0
                          ? 'text-sm font-extrabold text-green-300'
                          : 'text-sm font-extrabold text-red-200'
                      }
                    >
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(m.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </PremiumCard>

        <PremiumCard title="Ações rápidas">
          <ul className="mt-1 list-disc space-y-2 pl-5 text-sm text-slate-300">
            <li>
              Ver lista de{' '}
              <Link className="font-semibold text-yellow-300 hover:text-yellow-200" href="/admin/estoque">
                baixo estoque
              </Link>
              .
            </li>
            <li>Editar preço/custo no produto trava automaticamente (manual vence a planilha).</li>
            <li>Próximo: relatórios de giro e ranking de produtos.</li>
          </ul>
        </PremiumCard>
      </div>
    </div>
  );
}
