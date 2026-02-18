'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { Button } from '@/app/admin/_components/ui/Button';
import { Input } from '@/app/admin/_components/ui/Input';
import { Select } from '@/app/admin/_components/ui/Select';
import { Modal } from '@/app/admin/_components/ui/Modal';

type Employee = {
  id: string;
  name: string;
  role: string | null;
  salary: number | null;
  hired_at: string | null;
  status: string;
};

type Payment = {
  id: string;
  employee_id: string | null;
  description: string | null;
  amount: number;
  paid_at: string;
};

function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `R$ ${Number(n).toFixed(2)}`;
}

type Attendance = {
  id: string;
  employee_id: string;
  day: string; // yyyy-mm-dd
  status: 'present' | 'absent' | 'note' | string;
  note: string | null;
};

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function RhClient({
  employees,
  payments,
  attendance,
}: {
  employees: Employee[];
  payments: Payment[];
  attendance: Attendance[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'dashboard' | 'employees' | 'payments'>('dashboard');

  const [modal, setModal] = useState<null | 'employee' | 'payment' | 'attendance'>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    role: '',
    salary: '',
    hiredAt: '',
    status: 'active',
  });
  const [paymentForm, setPaymentForm] = useState({ employeeId: '', description: '', amount: '', paidAt: '' });
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const [attendanceForm, setAttendanceForm] = useState({
    day: isoDate(new Date()),
    status: 'present' as 'present' | 'absent' | 'note',
    note: '',
  });
  const [selectedDay, setSelectedDay] = useState<string>(isoDate(new Date()));

  const activeEmployees = useMemo(() => employees.filter((e) => e.status === 'active').length, [employees]);

  const payrollThisMonth = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return payments
      .filter((p) => {
        const d = new Date(p.paid_at);
        return d >= start && d < end;
      })
      .reduce((a, p) => a + Number(p.amount || 0), 0);
  }, [payments]);

  const attendanceByDay = useMemo(() => {
    const m = new Map<string, Attendance>();
    for (const a of attendance) {
      if (!selectedEmployeeId) continue;
      if (a.employee_id !== selectedEmployeeId) continue;
      m.set(a.day, a);
    }
    return m;
  }, [attendance, selectedEmployeeId]);

  const calendar = useMemo(() => {
    const base = monthCursor;
    const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
    const startWeekday = monthStart.getDay();
    const firstCell = addDays(monthStart, -startWeekday);

    const cells: {
      date: string;
      inMonth: boolean;
      status: string | null;
      note: string | null;
    }[] = [];

    for (let i = 0; i < 42; i++) {
      const d = addDays(firstCell, i);
      const ds = isoDate(d);
      const inMonth = d.getMonth() === monthStart.getMonth();
      const a = attendanceByDay.get(ds);
      cells.push({ date: ds, inMonth, status: a?.status ?? null, note: a?.note ?? null });
    }

    return {
      monthLabel: monthStart.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
      cells,
    };
  }, [attendanceByDay, monthCursor]);

  async function createEmployee() {
    if (!employeeForm.name.trim()) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase.from('hr_employees').insert({
      name: employeeForm.name.trim(),
      role: employeeForm.role.trim() || null,
      salary: employeeForm.salary.trim() ? Number(employeeForm.salary) : null,
      hired_at: employeeForm.hiredAt || null,
      status: employeeForm.status,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setModal(null);
    setEmployeeForm({ name: '', role: '', salary: '', hiredAt: '', status: 'active' });
    router.refresh();
    setSaving(false);
  }

  async function createPayment() {
    if (!paymentForm.amount.trim()) return;
    setSaving(true);
    setError(null);

    const paid_at = paymentForm.paidAt
      ? new Date(paymentForm.paidAt).toISOString()
      : new Date().toISOString();

    const { error: payError } = await supabase.from('hr_payments').insert({
      employee_id: paymentForm.employeeId || null,
      description: paymentForm.description.trim() || 'Pagamento RH',
      amount: Number(paymentForm.amount),
      paid_at,
    });

    if (payError) {
      setError(payError.message);
      setSaving(false);
      return;
    }

    // Also register in Finance as expense
    await supabase.from('finance_transactions').insert({
      type: 'expense',
      category: 'RH',
      description: paymentForm.description.trim() || 'Pagamento RH',
      amount: Number(paymentForm.amount),
      occurred_at: paid_at,
    });

    setModal(null);
    setPaymentForm({ employeeId: '', description: '', amount: '', paidAt: '' });
    router.refresh();
    setSaving(false);
  }

  async function upsertAttendance(args: {
    employeeId: string;
    day: string;
    status: 'present' | 'absent' | 'note';
    note?: string | null;
  }) {
    if (!args.employeeId) {
      setError('Selecione um funcionário.');
      return;
    }

    setSaving(true);
    setError(null);

    const { error } = await supabase.from('hr_attendance').upsert(
      {
        employee_id: args.employeeId,
        day: args.day,
        status: args.status,
        note: args.note ?? null,
      },
      { onConflict: 'employee_id,day' },
    );

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.refresh();
    setSaving(false);
  }

  async function markToday(status: 'present' | 'absent') {
    const day = isoDate(new Date());
    await upsertAttendance({ employeeId: selectedEmployeeId, day, status, note: null });
  }

  async function saveAttendanceForm() {
    await upsertAttendance({
      employeeId: selectedEmployeeId,
      day: attendanceForm.day,
      status: attendanceForm.status,
      note: attendanceForm.note.trim() || null,
    });
    setModal(null);
    setAttendanceForm({ day: selectedDay, status: 'present', note: '' });
  }

  function openAttendanceEditor(day: string) {
    if (!selectedEmployeeId) {
      setError('Selecione um funcionário para editar presenças.');
      return;
    }

    const found = attendanceByDay.get(day);
    setSelectedDay(day);
    setAttendanceForm({
      day,
      status: (found?.status === 'absent' ? 'absent' : found?.status === 'note' ? 'note' : 'present') as any,
      note: found?.note || '',
    });
    setError(null);
    setModal('attendance');
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">RH</div>
          <div className="mt-1 text-3xl font-extrabold text-slate-100">RH</div>
          <div className="mt-1 text-sm text-slate-400">Funcionários, pagamentos e custos de RH</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setModal('employee')}>
            + Funcionário
          </Button>
          <Button variant="ghost" onClick={() => setModal('payment')}>
            + Pagamento
          </Button>
        </div>
      </div>

      <Modal open={modal === 'employee'} title="Novo funcionário" onClose={() => setModal(null)}>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void createEmployee();
          }}
        >
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</label>
          <Input
            value={employeeForm.name}
            onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cargo</label>
          <Input
            value={employeeForm.role}
            onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Salário</label>
          <Input
            inputMode="decimal"
            value={employeeForm.salary}
            onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admissão</label>
          <Input
            type="date"
            value={employeeForm.hiredAt}
            onChange={(e) => setEmployeeForm({ ...employeeForm, hiredAt: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
          <Select
            value={employeeForm.status}
            onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </Select>

          {error && <div className="text-sm text-red-200">{error}</div>}
          <Button disabled={saving} type="submit">
            Salvar
          </Button>
        </form>
      </Modal>

      <Modal open={modal === 'payment'} title="Novo pagamento" onClose={() => setModal(null)}>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void createPayment();
          }}
        >
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Funcionário (opcional)
          </label>
          <Select
            value={paymentForm.employeeId}
            onChange={(e) => setPaymentForm({ ...paymentForm, employeeId: e.target.value })}
          >
            <option value="">—</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição</label>
          <Input
            value={paymentForm.description}
            onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</label>
          <Input
            inputMode="decimal"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data/Hora</label>
          <Input
            type="datetime-local"
            value={paymentForm.paidAt}
            onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })}
          />

          {error && <div className="text-sm text-red-200">{error}</div>}
          <Button disabled={saving} type="submit">
            Salvar
          </Button>
        </form>
      </Modal>

      <Modal open={modal === 'attendance'} title="Editar dia" onClose={() => setModal(null)}>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void saveAttendanceForm();
          }}
        >
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Funcionário</label>
          <Select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
            <option value="">Selecione…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dia</label>
          <Input
            type="date"
            value={attendanceForm.day}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, day: e.target.value })}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
          <Select
            value={attendanceForm.status}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value as any })}
          >
            <option value="present">Presente</option>
            <option value="absent">Falta</option>
            <option value="note">Observação</option>
          </Select>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nota (opcional)
          </label>
          <Input
            value={attendanceForm.note}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, note: e.target.value })}
          />

          {error && <div className="text-sm text-red-200">{error}</div>}
          <Button disabled={saving} type="submit">
            Salvar
          </Button>
        </form>
      </Modal>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab('dashboard')}
          className={
            'rounded-full px-4 py-2 text-sm font-semibold ' +
            (tab === 'dashboard' ? 'bg-white/10 text-white' : 'bg-slate-950 text-slate-300 hover:bg-white/5')
          }
        >
          Painel
        </button>
        <button
          onClick={() => setTab('employees')}
          className={
            'rounded-full px-4 py-2 text-sm font-semibold ' +
            (tab === 'employees' ? 'bg-white/10 text-white' : 'bg-slate-950 text-slate-300 hover:bg-white/5')
          }
        >
          Funcionários
        </button>
        <button
          onClick={() => setTab('payments')}
          className={
            'rounded-full px-4 py-2 text-sm font-semibold ' +
            (tab === 'payments' ? 'bg-white/10 text-white' : 'bg-slate-950 text-slate-300 hover:bg-white/5')
          }
        >
          Pagamentos
        </button>
      </div>

      {tab === 'dashboard' && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Funcionários ativos
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-100">{activeEmployees}</div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Folha (mês)</div>
              <div className="mt-2 text-3xl font-extrabold text-amber-200">{money(payrollThisMonth)}</div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pagamentos (total)
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-100">{payments.length}</div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <div className="border-b border-white/10 px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-200">Presenças / Observações</div>
                    <div className="mt-1 text-xs text-slate-500 capitalize">{calendar.monthLabel}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="min-w-[220px]"
                    >
                      <option value="">Selecione funcionário…</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </Select>

                    <button
                      onClick={() =>
                        setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-300">
                    Presente
                  </div>
                  <div className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-200">
                    Falta
                  </div>
                  <div className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                    Obs.
                  </div>
                  <div className="ml-auto text-xs text-slate-500">(clique no dia para editar)</div>
                </div>

                <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-slate-500">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                    <div key={d} className="text-center">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-7 gap-2">
                  {calendar.cells.map((c) => {
                    const day = c.date.split('-')[2];
                    const dot =
                      c.status === 'present'
                        ? 'bg-green-400'
                        : c.status === 'absent'
                          ? 'bg-red-400'
                          : c.status
                            ? 'bg-amber-300'
                            : null;

                    return (
                      <button
                        type="button"
                        key={c.date}
                        title={
                          c.note ? `${c.date} — ${c.note}` : c.status ? `${c.date} — ${c.status}` : c.date
                        }
                        onClick={() => openAttendanceEditor(c.date)}
                        className={
                          'rounded-xl border p-2 text-left transition-colors hover:bg-white/10 ' +
                          (c.date === selectedDay
                            ? 'border-amber-300/60 bg-amber-300/10'
                            : c.inMonth
                              ? 'border-white/10 bg-white/5'
                              : 'border-white/5 bg-slate-950 text-slate-600')
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="text-xs font-semibold text-slate-200">{Number(day)}</div>
                          {dot && <div className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
                        </div>
                        {c.note && (
                          <div className="mt-1 line-clamp-2 text-[10px] text-slate-400">{c.note}</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    RH (pós-calendário)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={saving}
                      onClick={() => openAttendanceEditor(selectedDay)}
                      className="rounded-full bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                    >
                      Editar dia selecionado ({selectedDay})
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => void markToday('present')}
                      className="rounded-full bg-green-500/15 px-4 py-2 text-xs font-semibold text-green-300 hover:bg-green-500/20 disabled:opacity-60"
                    >
                      Marcar Presença (Hoje)
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => void markToday('absent')}
                      className="rounded-full bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                    >
                      Marcar Falta (Hoje)
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => {
                        if (!selectedEmployeeId) {
                          setError('Selecione um funcionário.');
                          return;
                        }
                        setAttendanceForm({ day: isoDate(new Date()), status: 'note', note: '' });
                        setModal('attendance');
                      }}
                      className="rounded-full bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                    >
                      Adicionar Observação
                    </button>
                  </div>
                  {error && <div className="mt-2 text-sm text-red-200">{error}</div>}
                  <div className="text-xs text-slate-500">
                    Agora já grava na tabela <span className="font-mono">hr_attendance</span>.
                  </div>
                </div>
              </div>
            </Panel>

            <Panel>
              <div className="border-b border-white/10 px-6 py-5">
                <div className="text-sm font-semibold text-slate-200">Pagamentos recentes</div>
                <div className="mt-1 text-xs text-slate-500">Últimos lançamentos</div>
              </div>
              <div className="px-6 py-6">
                {payments.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <div className="text-sm font-semibold text-slate-200">Nenhum pagamento</div>
                    <div className="mt-1 text-sm text-slate-400">
                      Quando você lançar pagamentos, eles aparecem aqui.
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {payments.slice(0, 6).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-100">
                            {p.description || 'Pagamento'}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {new Date(p.paid_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-extrabold text-slate-100">{money(p.amount)}</div>
                          <div className="mt-1 text-xs text-slate-500">RH</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </>
      )}

      {tab === 'employees' && (
        <Panel>
          <div className="border-b border-white/10 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">Funcionários</div>
              <div className="text-xs text-slate-400">{employees.length} cadastrados</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Cargo</th>
                  <th className="px-6 py-4">Salário</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4 font-semibold text-slate-100">{e.name}</td>
                    <td className="px-6 py-4 text-slate-300">{e.role ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{money(e.salary)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          'rounded-full px-3 py-1 text-xs font-semibold ' +
                          (e.status === 'active'
                            ? 'bg-green-500/15 text-green-300'
                            : 'bg-white/10 text-slate-200')
                        }
                      >
                        {e.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-slate-400">
                      Nenhum funcionário cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === 'payments' && (
        <Panel>
          <div className="border-b border-white/10 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">Pagamentos</div>
              <div className="text-xs text-slate-400">{payments.length} lançados</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Valor</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(p.paid_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-slate-200">{p.description ?? '—'}</td>
                    <td className="px-6 py-4 font-semibold text-slate-100">{money(p.amount)}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-slate-400">
                      Nenhum pagamento lançado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
