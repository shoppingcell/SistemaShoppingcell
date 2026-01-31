'use client';

import { useMemo, useState } from 'react';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { Button } from '@/app/admin/_components/ui/Button';

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

export function RhClient({ employees, payments }: { employees: Employee[]; payments: Payment[] }) {
  const [tab, setTab] = useState<'dashboard' | 'employees' | 'payments'>('dashboard');

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

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">RH</div>
          <div className="mt-1 text-3xl font-extrabold text-slate-100">RH</div>
          <div className="mt-1 text-sm text-slate-400">Funcionários, pagamentos e custos de RH</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">+ Funcionário</Button>
          <Button variant="ghost">+ Pagamento</Button>
        </div>
      </div>

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
                <div className="text-sm font-semibold text-slate-200">Próximos passos</div>
                <div className="mt-1 text-xs text-slate-500">(vamos completar o módulo todo)</div>
              </div>
              <div className="px-6 py-6 text-sm text-slate-300">
                <ul className="list-disc space-y-2 pl-5">
                  <li>CRUD de funcionários (nome, cargo, salário, admissão, status).</li>
                  <li>Pagamentos (gera saída no Financeiro automaticamente).</li>
                  <li>Relatórios por mês/funcionário (custo total e média).</li>
                </ul>
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
