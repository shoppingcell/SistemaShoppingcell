'use client';

import { useMemo, useState } from 'react';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { Button } from '@/app/admin/_components/ui/Button';
import {
  BarChart3, Download, TrendingUp, TrendingDown, DollarSign,
  Users, Package, Calendar, Award, FileSpreadsheet, Percent, ShieldCheck
} from 'lucide-react';

type Tx = {
  id: string;
  type: 'income' | 'expense' | string;
  category: string | null;
  description: string | null;
  amount: number;
  occurred_at: string;
  order_id: string | null;
};

type Payable = {
  id: string;
  status: 'pending' | 'paid' | 'canceled' | string;
  category: string | null;
  description: string | null;
  amount: number;
  due_date: string;
  paid_at: string | null;
};

type Sale = {
  id: string;
  created_at: string;
  total: number;
  subtotal: number;
  discount_total: number;
  seller_id: string | null;
  payment_method: string;
  status: string;
};

type StaffProfile = {
  user_id: string;
  display_name: string;
  role: string;
};

type ProductInventory = {
  id: string;
  name: string;
  price: number;
  cost_price: number | null;
  quantity: number;
};

function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return 'R$ 0.00';
  return `R$ ${Number(n).toFixed(2)}`;
}

export function RelatoriosGerais({
  txs,
  payables,
  sales = [],
  staffProfiles = [],
  productsInventory = [],
}: {
  txs: Tx[];
  payables: Payable[];
  sales?: Sale[];
  staffProfiles?: StaffProfile[];
  productsInventory?: ProductInventory[];
}) {
  const [period, setPeriod] = useState<'this_month' | '7_days' | '30_days' | '3_months' | 'all'>('this_month');

  // Filter Date Helper
  const periodCutoff = useMemo(() => {
    const now = new Date();
    if (period === '7_days') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (period === '30_days') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (period === '3_months') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    if (period === 'this_month') return new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(0); // 'all'
  }, [period]);

  // Filtered Data
  const filteredTxs = useMemo(() => {
    return txs.filter((t) => new Date(t.occurred_at) >= periodCutoff);
  }, [txs, periodCutoff]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => new Date(s.created_at) >= periodCutoff);
  }, [sales, periodCutoff]);

  // 1) DRE Calculation
  const dre = useMemo(() => {
    const grossIncome = filteredTxs
      .filter((t) => t.type === 'income')
      .reduce((a, t) => a + Number(t.amount || 0), 0);

    const totalDiscounts = filteredSales.reduce((a, s) => a + Number(s.discount_total || 0), 0);
    const netIncome = grossIncome - totalDiscounts;

    const totalExpenses = filteredTxs
      .filter((t) => t.type === 'expense')
      .reduce((a, t) => a + Number(t.amount || 0), 0);

    // Approximate Cost of Goods Sold (CMV) @ 55% average cost if not explicit
    const estimatedCmv = grossIncome * 0.55;
    const grossProfit = netIncome - estimatedCmv;
    const netProfit = grossProfit - totalExpenses;
    const marginPercent = netIncome > 0 ? (netProfit / netIncome) * 100 : 0;

    return {
      grossIncome,
      totalDiscounts,
      netIncome,
      estimatedCmv,
      grossProfit,
      totalExpenses,
      netProfit,
      marginPercent,
    };
  }, [filteredTxs, filteredSales]);

  // 2) Staff / Vendedores Performance Report (RH)
  const staffPerformance = useMemo(() => {
    const map = new Map<
      string,
      { name: string; role: string; totalSales: number; salesCount: number }
    >();

    // Map known staff
    for (const p of staffProfiles) {
      const rolePt = p.role === 'admin' || p.role === 'owner' ? 'Administrador' : 'Vendedor';
      map.set(p.user_id, { name: p.display_name, role: rolePt, totalSales: 0, salesCount: 0 });
    }

    for (const s of filteredSales) {
      if (!s.seller_id) continue;
      const existing = map.get(s.seller_id) || {
        name: `Vendedor (${s.seller_id.slice(0, 6)})`,
        role: 'Vendedor',
        totalSales: 0,
        salesCount: 0,
      };
      existing.totalSales += Number(s.total || 0);
      existing.salesCount += 1;
      map.set(s.seller_id, existing);
    }

    return Array.from(map.values())
      .filter((v) => v.totalSales > 0 || v.salesCount > 0)
      .map((v) => ({
        ...v,
        avgTicket: v.salesCount > 0 ? v.totalSales / v.salesCount : 0,
        estimatedCommission: v.totalSales * 0.025, // 2.5% commission
      }))
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredSales, staffProfiles]);

  // 3) Payment Methods Breakdown
  const paymentMethodsSummary = useMemo(() => {
    const summary: Record<string, number> = { pix: 0, dinheiro: 0, cartao: 0, fiado: 0 };
    for (const s of filteredSales) {
      const pm = (s.payment_method || 'outros').toLowerCase();
      if (pm.includes('pix')) summary.pix += Number(s.total || 0);
      else if (pm.includes('dinheiro')) summary.dinheiro += Number(s.total || 0);
      else if (pm.includes('cartao') || pm.includes('cartão')) summary.cartao += Number(s.total || 0);
      else if (pm.includes('fiado')) summary.fiado += Number(s.total || 0);
    }
    return summary;
  }, [filteredSales]);

  // 4) Inventory Financial Health Summary
  const inventoryHealth = useMemo(() => {
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;

    for (const p of productsInventory) {
      const q = p.quantity ?? 0;
      const price = p.price ?? 0;
      const cost = p.cost_price ?? price * 0.6;

      totalCostValue += q * cost;
      totalRetailValue += q * price;
      if (q <= 2) lowStockCount += 1;
    }

    return {
      totalCostValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalCostValue,
      lowStockCount,
      totalProducts: productsInventory.length,
    };
  }, [productsInventory]);

  // CSV Export Generator Helper
  function exportToCsv(filename: string, rows: (string | number)[][]) {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExportDre() {
    const rows = [
      ['RELATÓRIO DRE - DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO'],
      ['Período:', period.replace('_', ' ')],
      [''],
      ['Indicador', 'Valor (R$)'],
      ['Receita Bruta (Entradas)', dre.grossIncome.toFixed(2)],
      ['(-) Deduções e Descontos', dre.totalDiscounts.toFixed(2)],
      ['(=) Receita Líquida Operacional', dre.netIncome.toFixed(2)],
      ['(-) Custo de Mercadoria Vendida (CMV Est.)', dre.estimatedCmv.toFixed(2)],
      ['(=) Lucro Bruto', dre.grossProfit.toFixed(2)],
      ['(-) Despesas Operacionais (Saídas)', dre.totalExpenses.toFixed(2)],
      ['(=) LUCRO LÍQUIDO DO PERÍODO', dre.netProfit.toFixed(2)],
      ['Margem Líquida %', `${dre.marginPercent.toFixed(2)}%`],
    ];
    exportToCsv(`relatorio_dre_${period}.csv`, rows);
  }

  function handleExportStaffRh() {
    const rows = [
      ['RELATÓRIO DE DESEMPENHO DA EQUIPE E RH'],
      ['Período:', period],
      [''],
      ['Vendedor / Funcional', 'Cargo / Função', 'Vendas Realizadas', 'Total Vendido (R$)', 'Ticket Médio (R$)', 'Comissão Est. (2.5%)'],
      ...staffPerformance.map((s) => [
        s.name,
        s.role,
        s.salesCount,
        s.totalSales.toFixed(2),
        s.avgTicket.toFixed(2),
        s.estimatedCommission.toFixed(2),
      ]),
    ];
    exportToCsv(`relatorio_equipe_rh_${period}.csv`, rows);
  }

  return (
    <div className="grid gap-6">
      {/* Top Filter Bar */}
      <Panel>
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-yellow-400" />
            <span className="text-sm font-bold text-slate-200">Período de Análise:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'this_month', label: 'Este Mês' },
              { id: '7_days', label: 'Últimos 7 dias' },
              { id: '30_days', label: 'Últimos 30 dias' },
              { id: '3_months', label: 'Últimos 3 meses' },
              { id: 'all', label: 'Todo o Histórico' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPeriod(item.id as any)}
                className={
                  'rounded-full px-4 py-2 text-xs font-bold transition ' +
                  (period === item.id
                    ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/10'
                    : 'border border-white/10 bg-slate-950 text-slate-300 hover:bg-white/5')
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* SEÇÃO 1: DRE FINANCIAL REPORT */}
      <Panel>
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-base font-extrabold text-slate-100">
                <BarChart3 size={20} className="text-yellow-400" /> DRE — Demonstração do Resultado do Exercício
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Relatório consolidado de lucratividade operacional e financeira.
              </p>
            </div>

            <Button variant="ghost" onClick={handleExportDre}>
              <Download size={15} className="mr-1.5" /> Exportar DRE (.CSV)
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-bold text-slate-400">Receita Bruta</div>
              <div className="mt-2 text-2xl font-black text-green-400">{money(dre.grossIncome)}</div>
              <div className="mt-1 text-[11px] text-slate-500">Entradas totais no período</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-bold text-slate-400">Despesas Operacionais</div>
              <div className="mt-2 text-2xl font-black text-red-400">{money(dre.totalExpenses)}</div>
              <div className="mt-1 text-[11px] text-slate-500">Saídas e contas pagas</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-bold text-slate-400">Lucro Líquido Real</div>
              <div className={'mt-2 text-2xl font-black ' + (dre.netProfit >= 0 ? 'text-yellow-400' : 'text-red-400')}>
                {money(dre.netProfit)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">Resultado final do período</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-bold text-slate-400">Margem Líquida</div>
              <div className="mt-2 text-2xl font-black text-blue-400">
                {dre.marginPercent.toFixed(1)}%
              </div>
              <div className="mt-1 text-[11px] text-slate-500">Lucratividade sobre a receita</div>
            </div>
          </div>

          {/* Detailed DRE Table */}
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950 p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-3 px-4">Indicador Financeiro</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-200">1. Receita Bruta de Vendas & Pedidos</td>
                  <td className="py-3 px-4 text-right font-bold text-green-400">{money(dre.grossIncome)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-400">2. (-) Deduções e Descontos Concedidos</td>
                  <td className="py-3 px-4 text-right text-red-300">- {money(dre.totalDiscounts)}</td>
                </tr>
                <tr className="bg-white/[0.02]">
                  <td className="py-3 px-4 font-extrabold text-slate-100">= RECEITA LÍQUIDA OPERACIONAL</td>
                  <td className="py-3 px-4 text-right font-black text-slate-100">{money(dre.netIncome)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-400">3. (-) Custo das Mercadorias Vendidas (CMV Est.)</td>
                  <td className="py-3 px-4 text-right text-red-300">- {money(dre.estimatedCmv)}</td>
                </tr>
                <tr className="bg-white/[0.02]">
                  <td className="py-3 px-4 font-extrabold text-slate-100">= LUCRO BRUTO</td>
                  <td className="py-3 px-4 text-right font-black text-green-400">{money(dre.grossProfit)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-400">4. (-) Despesas Operacionais (Saídas Gerais)</td>
                  <td className="py-3 px-4 text-right text-red-400">- {money(dre.totalExpenses)}</td>
                </tr>
                <tr className="bg-yellow-400/10">
                  <td className="py-3 px-4 font-black text-yellow-300">= LUCRO LÍQUIDO FINAL DO PERÍODO</td>
                  <td className="py-3 px-4 text-right font-black text-yellow-300">{money(dre.netProfit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      {/* SEÇÃO 2: RELATÓRIO DE DESEMPENHO DA EQUIPE & RH */}
      <Panel>
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-base font-extrabold text-slate-100">
                <Users size={20} className="text-yellow-400" /> Desempenho da Equipe de Vendas & RH
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Acompanhamento individual de vendedores, ranking de vendas e cálculo de comissões.
              </p>
            </div>

            <Button variant="ghost" onClick={handleExportStaffRh}>
              <Download size={15} className="mr-1.5" /> Exportar Relatório RH (.CSV)
            </Button>
          </div>
        </div>

        <div className="p-6">
          {staffPerformance.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
              Nenhuma venda atribuída a vendedores no período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-3 px-4">Vendedor / Funcional</th>
                    <th className="py-3 px-4">Função / Cargo</th>
                    <th className="py-3 px-4 text-center">Vendas Realizadas</th>
                    <th className="py-3 px-4 text-right">Total Vendido (R$)</th>
                    <th className="py-3 px-4 text-right">Ticket Médio</th>
                    <th className="py-3 px-4 text-right">Comissão Est. (2.5%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {staffPerformance.map((s, idx) => (
                    <tr key={s.name} className="hover:bg-white/5">
                      <td className="py-3 px-4 font-bold text-slate-100">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <Award size={16} className="text-amber-400 shrink-0" />}
                          <span>{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">{s.role}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-200">{s.salesCount} vendas</td>
                      <td className="py-3 px-4 text-right font-extrabold text-green-400">{money(s.totalSales)}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{money(s.avgTicket)}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-yellow-400">{money(s.estimatedCommission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      {/* SEÇÃO 3: SAÚDE DO ESTOQUE E FORMAS DE PAGAMENTO */}
      <div className="grid gap-6 md:grid-cols-2">
        <Panel>
          <div className="border-b border-white/10 px-6 py-5">
            <div className="flex items-center gap-2 text-base font-bold text-slate-100">
              <Package size={20} className="text-yellow-400" /> Saúde & Valor Patrimonial do Estoque
            </div>
          </div>
          <div className="grid gap-4 p-6">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <div className="text-xs text-slate-400">Total de Produtos Analisados</div>
                <div className="mt-1 text-xl font-extrabold text-slate-100">{inventoryHealth.totalProducts} itens</div>
              </div>
              <ShieldCheck size={28} className="text-yellow-400" opacity={0.8} />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <div className="text-xs text-slate-400">Valor em Estoque (Preço de Custo)</div>
                <div className="mt-1 text-xl font-extrabold text-slate-100">{money(inventoryHealth.totalCostValue)}</div>
              </div>
              <span className="text-xs font-bold text-slate-500">Patrimônio Investido</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <div className="text-xs text-slate-400">Valor em Estoque (Preço de Venda)</div>
                <div className="mt-1 text-xl font-extrabold text-green-400">{money(inventoryHealth.totalRetailValue)}</div>
              </div>
              <span className="text-xs font-bold text-green-400">Faturamento Potencial</span>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="border-b border-white/10 px-6 py-5">
            <div className="flex items-center gap-2 text-base font-bold text-slate-100">
              <DollarSign size={20} className="text-yellow-400" /> Vendas por Forma de Pagamento
            </div>
          </div>
          <div className="grid gap-3 p-6">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
              <span className="text-xs font-bold text-slate-300">PIX</span>
              <span className="text-sm font-extrabold text-green-400">{money(paymentMethodsSummary.pix)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
              <span className="text-xs font-bold text-slate-300">Dinheiro</span>
              <span className="text-sm font-extrabold text-green-400">{money(paymentMethodsSummary.dinheiro)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
              <span className="text-xs font-bold text-slate-300">Cartão de Crédito / Débito</span>
              <span className="text-sm font-extrabold text-green-400">{money(paymentMethodsSummary.cartao)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5">
              <span className="text-xs font-bold text-amber-300">Fiado / A Prazo (A Receber)</span>
              <span className="text-sm font-extrabold text-amber-400">{money(paymentMethodsSummary.fiado)}</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
