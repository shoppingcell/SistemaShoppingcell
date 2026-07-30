'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/admin/_components/ui/Button';
import { Input } from '@/app/admin/_components/ui/Input';
import { Select } from '@/app/admin/_components/ui/Select';
import { KeyRound, Shield, UserCheck, Plus, Trash2, CheckCircle } from 'lucide-react';

type AdminUser = {
  user_id: string;
  email?: string;
  role?: string;
  display_name?: string;
  pin_code?: string;
};

type HrEmployee = {
  id: string;
  name: string;
  role: string;
};

export function AcessosClient({
  admins,
  employees,
}: {
  admins: AdminUser[];
  employees: HrEmployee[];
}) {
  const router = useRouter();
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [role, setRole] = useState('staff');
  const [pin, setPin] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // When selecting an employee from the dropdown
  function handleSelectEmployee(empId: string) {
    setSelectedEmpId(empId);
    if (!empId) return;
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setNameInput(emp.name);
      setUserIdInput(emp.id);
    }
  }

  async function handleAddOrUpdatePin(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const targetUserId = userIdInput.trim() || selectedEmpId;
    if (!targetUserId) {
      setError('Informe o ID do usuário (UUID) ou selecione um funcionário.');
      setSaving(false);
      return;
    }

    if (pin && (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin))) {
      setError('O PIN deve conter exatamente entre 4 e 6 números (ex: 1234).');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/vendedor/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          employeeName: nameInput.trim() || 'Vendedor',
          role,
          pin,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Falha ao salvar acesso.');
        return;
      }

      setSuccess('Acesso e PIN salvos com sucesso!');
      setPin('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      {/* Add / Edit Access Box */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <div className="flex items-center gap-2 text-base font-extrabold text-slate-100">
          <KeyRound size={20} className="text-yellow-400" /> Adicionar / Cadastrar Acesso e PIN de Vendedor
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Cadastre a senha numérica (PIN de 4 a 6 dígitos) para o vendedor acessar o **Portal do Vendedor Mobile**.
        </p>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            {success}
          </div>
        )}

        <form onSubmit={handleAddOrUpdatePin} className="mt-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                1. Selecionar Funcionário (RH)
              </label>
              <Select
                value={selectedEmpId}
                onChange={(e) => handleSelectEmployee(e.target.value)}
                className="mt-1.5"
              >
                <option value="">-- Selecionar da lista de funcionários --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role || 'Vendedor'})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Ou digitar Nome do Vendedor
              </label>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ex: João da Silva"
                className="mt-1.5"
              >
              </Input>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                User ID (UUID do Supabase)
              </label>
              <Input
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Nível de Acesso (Cargo)
              </label>
              <Select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1.5">
                <option value="staff">Vendedor / Equipe (Staff)</option>
                <option value="manager">Gerente (Manager)</option>
                <option value="owner">Proprietário (Owner)</option>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-yellow-400 uppercase tracking-wide">
                PIN de Acesso (4 a 6 dígitos)
              </label>
              <Input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 1234"
                className="mt-1.5 font-mono text-center tracking-widest text-lg border-yellow-400/40"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando PIN…' : 'Salvar Permissões & PIN'}
            </Button>
          </div>
        </form>
      </div>

      {/* List of Admins & Sellers */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold text-slate-100">Vendedores e Administradores Cadastrados</div>
            <div className="mt-0.5 text-xs text-slate-400">
              Usuários autorizados a operar o painel ou Portal do Vendedor Mobile.
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {admins.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-400">
              Nenhum administrador ou vendedor listado.
            </div>
          ) : (
            admins.map((a) => (
              <div key={a.user_id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-extrabold text-white">
                        {a.display_name || a.email || 'Vendedor'}
                      </span>
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-yellow-300">
                        {a.role === 'owner' ? 'Proprietário' : a.role === 'manager' ? 'Gerente' : 'Vendedor'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400 font-mono">ID: {a.user_id}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    {a.pin_code ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400">
                        <CheckCircle size={14} /> PIN Cadastrado
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-400">Sem PIN definido</span>
                    )}

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setUserIdInput(a.user_id);
                        setNameInput(a.display_name || a.email || '');
                        setRole(a.role || 'staff');
                      }}
                    >
                      Editar PIN
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
