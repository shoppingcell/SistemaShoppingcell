'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { Button } from '@/app/admin/_components/ui/Button';
import { Input } from '@/app/admin/_components/ui/Input';
import { Modal } from '@/app/admin/_components/ui/Modal';
import { RelatoriosGerais } from './RelatoriosGerais';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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
  due_date: string; // yyyy-mm-dd
  paid_at: string | null;
};

function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `R$ ${Number(n).toFixed(2)}`;
}

function shortMonthLabel(iso: string) {
  const [y, m] = iso.split('-');
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
}

function shortDay(iso: string) {
  const [, m, d] = String(iso || '').split('-');
  if (!d) return iso;
  return `${d}/${m}`;
}

function formatDateBr(isoDateStr: string) {
  if (!isoDateStr) return '';
  const [y, m, d] = isoDateStr.split('-');
  if (!d) return isoDateStr;
  return `${d}/${m}/${y}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function FinanceiroClient({
  txs,
  payables,
  sales = [],
  staffProfiles = [],
  productsInventory = [],
}: {
  txs: Tx[];
  payables: Payable[];
  sales?: any[];
  staffProfiles?: any[];
  productsInventory?: any[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'dashboard' | 'transactions' | 'reports'>('dashboard');
  const [payablesFilter, setPayablesFilter] = useState<'all' | 'overdue' | 'today' | 'week'>('all');

  const [modal, setModal] = useState<null | 'income' | 'expense' | 'payable'>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form for transaction / quick payable
  const [form, setForm] = useState({
    amount: '',
    category: '',
    description: '',
    occurredAt: '',
    dueDate: '',
  });

  // Calendar State & Interactivity
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null);
  const [isAddPayableForDate, setIsAddPayableForDate] = useState(false);

  // Payable Edit/Add Form State
  const [payableForm, setPayableForm] = useState({
    id: '',
    description: '',
    amount: '',
    category: '',
    dueDate: '',
    status: 'pending',
  });

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayIso = useMemo(() => isoDate(today), [today]);

  const income = useMemo(
    () => txs.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.amount || 0), 0),
    [txs],
  );
  const expense = useMemo(
    () => txs.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.amount || 0), 0),
    [txs],
  );
  const balance = income - expense;

  const pendingPayablesTotal = useMemo(
    () => payables.filter((p) => p.status === 'pending').reduce((a, p) => a + Number(p.amount || 0), 0),
    [payables],
  );

  const cashflowLast6Months = useMemo(() => {
    const buckets: { key: string; income: number; expense: number; profit: number }[] = [];
    const base = new Date(today.getFullYear(), today.getMonth(), 1);

    for (let i = 5; i >= 0; i--) {
      const d = new Date(base);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, income: 0, expense: 0, profit: 0 });
    }

    for (const t of txs) {
      const dt = new Date(t.occurred_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const b = buckets.find((x) => x.key === key);
      if (!b) continue;
      if (t.type === 'income') b.income += Number(t.amount || 0);
      if (t.type === 'expense') b.expense += Number(t.amount || 0);
    }

    for (const b of buckets) b.profit = b.income - b.expense;

    return buckets;
  }, [txs, today]);

  const expensesByCategoryThisMonth = useMemo(() => {
    const d0 = new Date(today.getFullYear(), today.getMonth(), 1);
    const d1 = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const map = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== 'expense') continue;
      const dt = new Date(t.occurred_at);
      if (dt < d0 || dt >= d1) continue;
      const k = (t.category || 'Outros').trim() || 'Outros';
      map.set(k, (map.get(k) || 0) + Number(t.amount || 0));
    }

    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [txs, today]);

  const payableFiltered = useMemo(() => {
    const weekEnd = isoDate(addDays(today, 7));

    return payables
      .filter((p) => p.status === 'pending')
      .filter((p) => {
        if (!isIsoDate(p.due_date)) return true;
        if (payablesFilter === 'all') return true;
        if (payablesFilter === 'today') return p.due_date === todayIso;
        if (payablesFilter === 'week') return p.due_date >= todayIso && p.due_date <= weekEnd;
        if (payablesFilter === 'overdue') return p.due_date < todayIso;
        return true;
      })
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  }, [payables, payablesFilter, today, todayIso]);

  // Calendar Calculation with Interactive Cells and Month Offset
  const calendar = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const startWeekday = base.getDay(); // 0 Sunday
    const firstCell = addDays(base, -startWeekday);

    const cells: {
      date: string;
      inMonth: boolean;
      isToday: boolean;
      pendingTotal: number;
      pendingCount: number;
      paidCount: number;
      totalCount: number;
      items: Payable[];
    }[] = [];

    for (let i = 0; i < 42; i++) {
      const d = addDays(firstCell, i);
      const ds = isoDate(d);
      const inMonth = d.getMonth() === base.getMonth();
      const isToday = ds === todayIso;
      const dayItems = payables.filter((p) => p.due_date === ds);
      const pendingItems = dayItems.filter((p) => p.status === 'pending');
      const paidItems = dayItems.filter((p) => p.status === 'paid');
      const pendingTotal = pendingItems.reduce((a, p) => a + Number(p.amount || 0), 0);

      cells.push({
        date: ds,
        inMonth,
        isToday,
        pendingTotal,
        pendingCount: pendingItems.length,
        paidCount: paidItems.length,
        totalCount: dayItems.length,
        items: dayItems,
      });
    }

    return {
      monthLabel: base.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
      cells,
    };
  }, [payables, today, todayIso, monthOffset]);

  const selectedDateItems = useMemo(() => {
    if (!selectedDate) return [];
    return payables.filter((p) => p.due_date === selectedDate);
  }, [payables, selectedDate]);

  const pieColors = ['#22c55e', '#f97316', '#ef4444', '#a855f7', '#06b6d4', '#facc15', '#3b82f6', '#94a3b8'];

  async function createTransaction(kind: 'income' | 'expense') {
    if (!form.amount.trim()) return;

    setSaving(true);
    setError(null);

    const occurred_at = form.occurredAt?.trim()
      ? new Date(form.occurredAt).toISOString()
      : new Date().toISOString();

    const { error } = await supabase.from('finance_transactions').insert({
      type: kind,
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      amount: Number(form.amount.replace(',', '.')),
      occurred_at,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setModal(null);
    setForm({ amount: '', category: '', description: '', occurredAt: '', dueDate: '' });
    router.refresh();
    setSaving(false);
  }

  async function createPayable() {
    if (!form.amount.trim() || !form.dueDate.trim()) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from('finance_payables').insert({
      status: 'pending',
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      amount: Number(form.amount.replace(',', '.')),
      due_date: form.dueDate,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setModal(null);
    setForm({ amount: '', category: '', description: '', occurredAt: '', dueDate: '' });
    router.refresh();
    setSaving(false);
  }

  async function markPayablePaid(id: string) {
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from('finance_payables')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.refresh();
    setSaving(false);
  }

  // Handle Save Payable (Create or Update)
  async function handleSavePayable(e: React.FormEvent) {
    e.preventDefault();
    if (!payableForm.amount.trim() || !payableForm.dueDate.trim()) {
      setError('Informe o valor e a data de vencimento.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      description: payableForm.description.trim() || null,
      category: payableForm.category.trim() || null,
      amount: Number(payableForm.amount.replace(',', '.')),
      due_date: payableForm.dueDate,
      status: payableForm.status || 'pending',
      paid_at: payableForm.status === 'paid' ? new Date().toISOString() : null,
    };

    let err: any = null;
    if (payableForm.id) {
      const { error: updateError } = await supabase
        .from('finance_payables')
        .update(payload)
        .eq('id', payableForm.id);
      err = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('finance_payables')
        .insert(payload);
      err = insertError;
    }

    if (err) {
      setError(err.message || 'Erro ao salvar a conta');
      setSaving(false);
      return;
    }

    setEditingPayable(null);
    setIsAddPayableForDate(false);
    setSaving(false);
    router.refresh();
  }

  // Handle Delete Payable
  async function handleDeletePayable(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir esta conta a pagar?')) return;

    setSaving(true);
    setError(null);

    const { error: deleteErr } = await supabase
      .from('finance_payables')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      setError(deleteErr.message || 'Erro ao excluir conta');
      setSaving(false);
      return;
    }

    setEditingPayable(null);
    setSaving(false);
    router.refresh();
  }

  function openAddForDate(targetDate: string) {
    setError(null);
    setPayableForm({
      id: '',
      description: '',
      amount: '',
      category: 'Fornecedores',
      dueDate: targetDate,
      status: 'pending',
    });
    setIsAddPayableForDate(true);
  }

  function openEditPayable(p: Payable) {
    setError(null);
    setPayableForm({
      id: p.id,
      description: p.description || '',
      amount: String(p.amount || ''),
      category: p.category || '',
      dueDate: p.due_date || '',
      status: p.status || 'pending',
    });
    setEditingPayable(p);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Financeiro</div>
          <div className="mt-1 text-3xl font-extrabold text-slate-100">Financeiro</div>
          <div className="mt-1 text-sm text-slate-400">Gestão de fluxo de caixa</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setModal('income')}>
            Receita
          </Button>
          <Button variant="ghost" onClick={() => setModal('expense')}>
            Despesa
          </Button>
          <Button variant="ghost" onClick={() => setModal('payable')}>
            Conta a pagar
          </Button>
        </div>
      </div>

      <Modal open={modal === 'income'} title="Nova receita" onClose={() => setModal(null)}>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void createTransaction('income');
          }}
        >
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</label>
          <Input
            inputMode="decimal"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria</label>
          <Input
            placeholder="Vendas"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição</label>
          <Input
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data/Hora</label>
          <Input
            type="datetime-local"
            value={form.occurredAt}
            onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
          />

          {error && <div className="text-sm text-red-200">{error}</div>}

          <Button disabled={saving} type="submit">
            Salvar
          </Button>
        </form>
      </Modal>

      <Modal open={modal === 'expense'} title="Nova despesa" onClose={() => setModal(null)}>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void createTransaction('expense');
          }}
        >
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</label>
          <Input
            inputMode="decimal"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria</label>
          <Input
            placeholder="Fornecedores, Aluguel, etc."
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição</label>
          <Input
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data/Hora</label>
          <Input
            type="datetime-local"
            value={form.occurredAt}
            onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
          />

          {error && <div className="text-sm text-red-200">{error}</div>}

          <Button disabled={saving} type="submit">
            Salvar
          </Button>
        </form>
      </Modal>

      <Modal open={modal === 'payable'} title="Nova conta a pagar" onClose={() => setModal(null)}>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void createPayable();
          }}
        >
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</label>
          <Input
            inputMode="decimal"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria</label>
          <Input
            placeholder="Fornecedores, Aluguel, Energia, etc."
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição</label>
          <Input
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Data de Vencimento
          </label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />

          {error && <div className="text-sm text-red-200">{error}</div>}

          <Button disabled={saving} type="submit">
            Salvar
          </Button>
        </form>
      </Modal>

      {/* Tabs Header */}
      <div className="flex gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setTab('dashboard')}
          className={
            'rounded-full px-4 py-2 text-xs font-semibold transition ' +
            (tab === 'dashboard'
              ? 'bg-yellow-400 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:bg-white/5')
          }
        >
          Visão Geral
        </button>
        <button
          onClick={() => setTab('transactions')}
          className={
            'rounded-full px-4 py-2 text-xs font-semibold transition ' +
            (tab === 'transactions'
              ? 'bg-yellow-400 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:bg-white/5')
          }
        >
          Transações
        </button>
        <button
          onClick={() => setTab('reports')}
          className={
            'rounded-full px-4 py-2 text-xs font-semibold transition ' +
            (tab === 'reports'
              ? 'bg-yellow-400 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:bg-white/5')
          }
        >
          Relatórios
        </button>
      </div>

      {tab === 'dashboard' && (
        <>
          {/* Top KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Panel>
              <div className="p-5">
                <div className="text-xs font-semibold text-slate-400">Receitas</div>
                <div className="mt-2 text-2xl font-extrabold text-green-400">{money(income)}</div>
              </div>
            </Panel>
            <Panel>
              <div className="p-5">
                <div className="text-xs font-semibold text-slate-400">Despesas</div>
                <div className="mt-2 text-2xl font-extrabold text-red-400">{money(expense)}</div>
              </div>
            </Panel>
            <Panel>
              <div className="p-5">
                <div className="text-xs font-semibold text-slate-400">Saldo Líquido</div>
                <div
                  className={
                    'mt-2 text-2xl font-extrabold ' + (balance >= 0 ? 'text-slate-100' : 'text-red-400')
                  }
                >
                  {money(balance)}
                </div>
              </div>
            </Panel>
            <Panel>
              <div className="p-5">
                <div className="text-xs font-semibold text-slate-400">A Pagar Pendente</div>
                <div className="mt-2 text-2xl font-extrabold text-amber-400">
                  {money(pendingPayablesTotal)}
                </div>
              </div>
            </Panel>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Panel>
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-200">Fluxo de Caixa (6 meses)</div>
                      <div className="mt-1 text-xs text-slate-400">Receitas vs Despesas</div>
                    </div>
                  </div>
                </div>

                <div className="h-72 px-3 py-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashflowLast6Months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="inc6" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="exp6" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" opacity={0.35} />
                      <XAxis
                        dataKey="key"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(v) => shortMonthLabel(String(v))}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#0b1220',
                          border: '1px solid #1f2937',
                          borderRadius: 14,
                        }}
                        labelStyle={{ color: '#e2e8f0' }}
                        itemStyle={{ color: '#e2e8f0' }}
                        formatter={(v: any, name: any) => [money(Number(v || 0)), String(name)]}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        name="Receitas"
                        stroke="#22c55e"
                        fill="url(#inc6)"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        name="Despesas"
                        stroke="#ef4444"
                        fill="url(#exp6)"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="px-6 pb-5">
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <div>
                      Receitas:{' '}
                      <span className="font-semibold text-slate-200">
                        {money(cashflowLast6Months.reduce((a, b) => a + b.income, 0))}
                      </span>
                    </div>
                    <div>
                      Despesas:{' '}
                      <span className="font-semibold text-slate-200">
                        {money(cashflowLast6Months.reduce((a, b) => a + b.expense, 0))}
                      </span>
                    </div>
                    <div>
                      Lucro:{' '}
                      <span className="font-semibold text-slate-200">
                        {money(cashflowLast6Months.reduce((a, b) => a + b.profit, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            <div>
              <Panel>
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="text-sm font-semibold text-slate-200">Despesas por Categoria</div>
                </div>
                <div className="h-72 px-3 py-4">
                  {expensesByCategoryThisMonth.length === 0 ? (
                    <div className="px-3 py-8 text-sm text-slate-400">Sem despesas no mês atual.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          contentStyle={{
                            background: '#0b1220',
                            border: '1px solid #1f2937',
                            borderRadius: 14,
                          }}
                          labelStyle={{ color: '#e2e8f0' }}
                          itemStyle={{ color: '#e2e8f0' }}
                          formatter={(v: any) => money(Number(v || 0))}
                        />
                        <Pie
                          data={expensesByCategoryThisMonth}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={2}
                        >
                          {expensesByCategoryThisMonth.map((_, i) => (
                            <Cell key={i} fill={pieColors[i % pieColors.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="px-6 pb-5">
                  <div className="grid gap-2">
                    {expensesByCategoryThisMonth.map((c) => (
                      <div key={c.name} className="flex items-center justify-between text-xs">
                        <div className="text-slate-300">{c.name}</div>
                        <div className="font-semibold text-slate-200">{money(c.value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          {/* Payables List & Interactive Calendar */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <div className="border-b border-white/10 px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-200">Contas a Pagar</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setPayablesFilter('all')}
                      className={
                        'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                        (payablesFilter === 'all'
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                      }
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setPayablesFilter('overdue')}
                      className={
                        'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                        (payablesFilter === 'overdue'
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                      }
                    >
                      Vencidas
                    </button>
                    <button
                      onClick={() => setPayablesFilter('today')}
                      className={
                        'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                        (payablesFilter === 'today'
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                      }
                    >
                      Hoje
                    </button>
                    <button
                      onClick={() => setPayablesFilter('week')}
                      className={
                        'rounded-full px-3 py-1.5 text-xs font-semibold ' +
                        (payablesFilter === 'week'
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                      }
                    >
                      7 dias
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                {payableFiltered.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <div className="text-sm font-semibold text-slate-200">Nenhuma conta pendente</div>
                    <div className="mt-1 text-sm text-slate-400">Tudo em dia!</div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {payableFiltered.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-100">
                            {p.description || '—'}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {p.category || 'Outros'} • vence {shortDay(p.due_date)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <div className="text-right">
                            <div className="text-sm font-extrabold text-slate-100">{money(p.amount)}</div>
                            <div className="mt-1 text-xs text-slate-400">pendente</div>
                          </div>
                          <button
                            title="Editar"
                            onClick={() => openEditPayable(p)}
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                          >
                            ✏️
                          </button>
                          <button
                            title="Baixar como Pago"
                            disabled={saving}
                            onClick={() => void markPayablePaid(p.id)}
                            className="rounded-full bg-green-500/15 px-3 py-1.5 text-xs font-semibold text-green-300 hover:bg-green-500/20 disabled:opacity-60"
                          >
                            Baixar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>

            {/* Interactive Calendário de Vencimentos */}
            <Panel>
              <div className="border-b border-white/10 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-200">Calendário de Vencimentos</div>
                    <div className="mt-1 text-xs text-slate-400 capitalize">{calendar.monthLabel}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setMonthOffset((m) => m - 1)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10"
                      title="Mês Anterior"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setMonthOffset(0)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                      title="Mês Atual"
                    >
                      Hoje
                    </button>
                    <button
                      onClick={() => setMonthOffset((m) => m + 1)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10"
                      title="Próximo Mês"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-slate-500">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                    <div key={d} className="text-center">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-7 gap-2">
                  {calendar.cells.map((c) => {
                    const day = c.date.split('-')[2];
                    return (
                      <button
                        key={c.date}
                        type="button"
                        onClick={() => setSelectedDate(c.date)}
                        className={
                          'group relative min-h-[58px] cursor-pointer rounded-2xl border p-2 text-left transition duration-150 ' +
                          (c.isToday ? 'ring-2 ring-yellow-400/80 ' : '') +
                          (c.inMonth
                            ? 'border-white/10 bg-white/[0.04] hover:border-yellow-400/50 hover:bg-yellow-400/[0.08]'
                            : 'border-white/5 bg-slate-950 text-slate-600 hover:bg-white/[0.02]')
                        }
                      >
                        <div className="flex items-start justify-between">
                          <span
                            className={
                              'text-xs font-bold ' +
                              (c.isToday
                                ? 'text-yellow-400 font-extrabold'
                                : c.inMonth
                                ? 'text-slate-200 group-hover:text-white'
                                : 'text-slate-600')
                            }
                          >
                            {Number(day)}
                          </span>

                          <div className="flex items-center gap-1">
                            {c.paidCount > 0 && (
                              <span className="h-1.5 w-1.5 rounded-full bg-green-400" title={`${c.paidCount} pagas`} />
                            )}
                            {c.pendingCount > 0 && (
                              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                {c.pendingCount}
                              </span>
                            )}
                          </div>
                        </div>

                        {c.pendingCount > 0 && (
                          <div className="mt-1 truncate text-[10px] font-extrabold text-amber-300">
                            {money(c.pendingTotal)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-400" /> Vencimento pendente
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-400" /> Pago
                    </span>
                  </div>
                  <span className="text-slate-500">Clique em qualquer dia para ver ou criar vencimentos</span>
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}

      {/* MODAL 1: Detalhes do Dia Selecionado no Calendário */}
      <Modal
        open={Boolean(selectedDate)}
        title={selectedDate ? `Vencimentos de ${formatDateBr(selectedDate)}` : 'Detalhes do Dia'}
        onClose={() => setSelectedDate(null)}
      >
        {selectedDate && (
          <div className="grid gap-4">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
              <div>
                <div className="text-xs text-slate-400">Data selecionada</div>
                <div className="text-sm font-bold text-slate-100">{formatDateBr(selectedDate)}</div>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  openAddForDate(selectedDate);
                }}
              >
                + Novo Vencimento
              </Button>
            </div>

            {selectedDateItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                Nenhuma conta cadastrada nesta data.
                <div className="mt-3">
                  <Button variant="ghost" onClick={() => openAddForDate(selectedDate)}>
                    Adicionar Vencimento
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {selectedDateItems.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">
                          {p.description || 'Sem descrição'}
                        </span>
                        <span
                          className={
                            'rounded-full px-2.5 py-0.5 text-[10px] font-bold ' +
                            (p.status === 'paid'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : p.status === 'canceled'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30')
                          }
                        >
                          {p.status === 'paid' ? 'Pago' : p.status === 'canceled' ? 'Cancelado' : 'Pendente'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {p.category || 'Geral'} • Vencimento: {formatDateBr(p.due_date)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="text-right font-extrabold text-sm text-slate-100">
                        {money(p.amount)}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {p.status === 'pending' && (
                          <button
                            title="Baixar como Pago"
                            disabled={saving}
                            onClick={() => void markPayablePaid(p.id)}
                            className="rounded-xl bg-green-500/20 px-3 py-1.5 text-xs font-bold text-green-300 hover:bg-green-500/30 border border-green-500/30"
                          >
                            Baixar
                          </button>
                        )}
                        <button
                          title="Editar Informações"
                          onClick={() => openEditPayable(p)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          title="Excluir"
                          disabled={saving}
                          onClick={() => void handleDeletePayable(p.id)}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL 2: Editar Conta a Pagar */}
      <Modal
        open={Boolean(editingPayable)}
        title="Editar Vencimento"
        onClose={() => setEditingPayable(null)}
      >
        <form className="grid gap-3" onSubmit={handleSavePayable}>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Descrição / Título *
          </label>
          <Input
            placeholder="Ex: Aluguel, Fornecedor de Telas, Energia"
            value={payableForm.description}
            onChange={(e) => setPayableForm({ ...payableForm, description: e.target.value })}
            required
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Valor (R$) *
          </label>
          <Input
            inputMode="decimal"
            placeholder="0.00"
            value={payableForm.amount}
            onChange={(e) => setPayableForm({ ...payableForm, amount: e.target.value })}
            required
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Categoria
          </label>
          <Input
            placeholder="Fornecedores, Aluguel, Energia, Salários, Impostos, etc."
            value={payableForm.category}
            onChange={(e) => setPayableForm({ ...payableForm, category: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Data de Vencimento *
          </label>
          <Input
            type="date"
            value={payableForm.dueDate}
            onChange={(e) => setPayableForm({ ...payableForm, dueDate: e.target.value })}
            required
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
          </label>
          <select
            value={payableForm.status}
            onChange={(e) => setPayableForm({ ...payableForm, status: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
          >
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="canceled">Cancelado</option>
          </select>

          {error && <div className="text-sm text-red-200">{error}</div>}

          <div className="flex items-center justify-between pt-2">
            {payableForm.id && (
              <button
                type="button"
                onClick={() => void handleDeletePayable(payableForm.id)}
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
              >
                Excluir
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="ghost" onClick={() => setEditingPayable(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Adicionar Novo Vencimento para uma Data Específica */}
      <Modal
        open={isAddPayableForDate}
        title={`Novo Vencimento — ${formatDateBr(payableForm.dueDate)}`}
        onClose={() => setIsAddPayableForDate(false)}
      >
        <form className="grid gap-3" onSubmit={handleSavePayable}>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Descrição / Título *
          </label>
          <Input
            placeholder="Ex: Fornecedor de peças, Conta de luz"
            value={payableForm.description}
            onChange={(e) => setPayableForm({ ...payableForm, description: e.target.value })}
            required
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Valor (R$) *
          </label>
          <Input
            inputMode="decimal"
            placeholder="0.00"
            value={payableForm.amount}
            onChange={(e) => setPayableForm({ ...payableForm, amount: e.target.value })}
            required
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Categoria
          </label>
          <Input
            placeholder="Fornecedores, Aluguel, Energia, Impostos, etc."
            value={payableForm.category}
            onChange={(e) => setPayableForm({ ...payableForm, category: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Data de Vencimento *
          </label>
          <Input
            type="date"
            value={payableForm.dueDate}
            onChange={(e) => setPayableForm({ ...payableForm, dueDate: e.target.value })}
            required
          />

          {error && <div className="text-sm text-red-200">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddPayableForDate(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Criando...' : 'Cadastrar Vencimento'}
            </Button>
          </div>
        </form>
      </Modal>

      {tab === 'transactions' && (
        <Panel>
          <div className="border-b border-white/10 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">Transações</div>
              <div className="text-xs text-slate-400">{txs.length} exibidas</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Pedido</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(t.occurred_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          'rounded-full px-3 py-1 text-xs font-semibold ' +
                          (t.type === 'income'
                            ? 'bg-green-500/15 text-green-300'
                            : 'bg-red-500/15 text-red-200')
                        }
                      >
                        {t.type === 'income' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{t.category ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-200">{t.description ?? '—'}</td>
                    <td className="px-6 py-4 font-semibold text-slate-100">{money(t.amount)}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {t.order_id ? String(t.order_id).slice(0, 8) : '—'}
                    </td>
                  </tr>
                ))}
                {txs.length === 0 && (
                  <tr>
                    <td className="px-6 py-10 text-slate-400" colSpan={6}>
                      Nenhuma movimentação ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === 'reports' && (
        <RelatoriosGerais
          txs={txs}
          payables={payables}
          sales={sales}
          staffProfiles={staffProfiles}
          productsInventory={productsInventory}
        />
      )}
    </div>
  );
}
