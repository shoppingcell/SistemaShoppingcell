'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/admin/_components/ui/Button';
import { Input } from '@/app/admin/_components/ui/Input';
import { Select } from '@/app/admin/_components/ui/Select';
import { KeyRound, Shield, UserCheck, Plus, Trash2, Edit3, CheckCircle, Mail, User } from 'lucide-react';

type SellerUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  pin_code?: string | null;
};

export function AcessosClient({
  sellers: initialSellers,
}: {
  sellers: SellerUser[];
}) {
  const router = useRouter();
  const [sellersList, setSellersList] = useState<SellerUser[]>(initialSellers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [pin, setPin] = useState('');

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setSellersList(initialSellers);
  }, [initialSellers]);

  function resetForm() {
    setEditingId(null);
    setName('');
    setEmail('');
    setRole('staff');
    setPin('');
    setError(null);
  }

  function startEdit(s: SellerUser) {
    setEditingId(s.id);
    setName(s.name);
    setEmail(s.email);
    setRole(s.role || 'staff');
    setPin(s.pin_code || '');
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSaveSeller(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Informe um e-mail válido para o login do vendedor.');
      setSaving(false);
      return;
    }

    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      setError('O PIN de acesso deve conter exatamente entre 4 e 6 números.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/vendedor/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          name: name.trim() || cleanEmail,
          email: cleanEmail,
          role,
          pin,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Falha ao salvar cadastro do vendedor.');
        return;
      }

      // Optimistic update local list
      const savedSeller: SellerUser = {
        id: data.seller?.id || editingId || 'sel_' + Date.now(),
        name: name.trim() || cleanEmail,
        email: cleanEmail,
        role,
        pin_code: pin,
      };

      setSellersList((prev) => {
        const idx = prev.findIndex((x) => x.id === savedSeller.id || x.email.toLowerCase() === cleanEmail);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = savedSeller;
          return next;
        }
        return [savedSeller, ...prev];
      });

      setSuccess(editingId ? 'Cadastro do vendedor atualizado com sucesso!' : 'Novo vendedor cadastrado com sucesso!');
      resetForm();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar ao servidor.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSeller(s: SellerUser) {
    if (!confirm(`Tem certeza que deseja excluir o cadastro do vendedor "${s.name}" (${s.email})?`)) {
      return;
    }

    setDeletingId(s.id);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/vendedor/pin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, email: s.email }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Erro ao excluir vendedor.');
        return;
      }

      setSellersList((prev) => prev.filter((x) => x.id !== s.id && x.email.toLowerCase() !== s.email.toLowerCase()));
      setSuccess('Vendedor removido com sucesso!');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-6">
      {/* Form: Add or Edit Seller */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-extrabold text-slate-100">
            <KeyRound size={20} className="text-yellow-400" />
            <span>{editingId ? 'Editar Cadastro de Vendedor' : 'Cadastrar Novo Vendedor'}</span>
          </div>

          {editingId && (
            <button
              onClick={resetForm}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10"
            >
              Cancelar Edição
            </button>
          )}
        </div>

        <p className="mt-1 text-xs text-slate-400">
          O vendedor utilizará o **E-mail** e a **Senha PIN de 4 a 6 números** para acessar o Portal do Vendedor.
        </p>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-200">
            {success}
          </div>
        )}

        <form onSubmit={handleSaveSeller} className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Nome do Vendedor / Funcionário
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Vendedor"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-yellow-400">
                E-mail de Login (Acesso do Vendedor)
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos@shoppingcell.tech"
                required
                className="mt-1.5 border-yellow-400/40 font-semibold"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Nível de Acesso (Cargo)
              </label>
              <Select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1.5">
                <option value="staff">Vendedor / Balcão (Staff)</option>
                <option value="manager">Gerente de Loja (Manager)</option>
                <option value="owner">Proprietário (Owner/Admin)</option>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-yellow-400">
                Senha PIN de Acesso (4 a 6 dígitos)
              </label>
              <Input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 1234"
                required
                className="mt-1.5 font-mono text-center text-lg tracking-widest border-yellow-400/40"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : editingId ? 'Atualizar Vendedor' : '+ Cadastrar Vendedor'}
            </Button>
          </div>
        </form>
      </div>

      {/* Sellers List Table */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold text-slate-100">Vendedores e Equipe Cadastrados</div>
            <div className="mt-0.5 text-xs text-slate-400">
              Lista completa de vendedores ativos no sistema com credenciais de login por E-mail e PIN.
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {sellersList.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center text-sm text-slate-400">
              Nenhum vendedor cadastrado ainda. Preencha o formulário acima para adicionar o primeiro vendedor.
            </div>
          ) : (
            sellersList.map((s) => (
              <div key={s.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-black text-white">{s.name}</span>
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-yellow-300">
                        {s.role === 'owner' ? 'Proprietário' : s.role === 'manager' ? 'Gerente' : 'Vendedor'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
                      <Mail size={13} className="text-yellow-400" />
                      <span className="font-semibold">{s.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {s.pin_code ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-xl border border-green-400/20">
                        <CheckCircle size={13} /> PIN: {s.pin_code}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-400">Sem PIN</span>
                    )}

                    <button
                      onClick={() => startEdit(s)}
                      className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10"
                    >
                      <Edit3 size={14} /> Editar
                    </button>

                    <button
                      onClick={() => handleDeleteSeller(s)}
                      disabled={deletingId === s.id}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/30"
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
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
