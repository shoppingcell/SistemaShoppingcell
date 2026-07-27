'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { Button } from '@/app/admin/_components/ui/Button';
import { Input } from '@/app/admin/_components/ui/Input';

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
};

type CreateCustomerModalProps = {
  open: boolean;
  onClose: () => void;
  initialName?: string;
  initialPhone?: string;
  onCreated: (customer: Customer) => void;
};

export function CreateCustomerModal({
  open,
  onClose,
  initialName = '',
  initialPhone = '',
  onCreated,
}: CreateCustomerModalProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setPhone(initialPhone);
      setError(null);
    }
  }, [open, initialName, initialPhone]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Nome é obrigatório');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('customers')
        .insert({
          name: cleanName,
          phone: phone.trim() || null,
        })
        .select('id, name, phone')
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Erro ao cadastrar cliente');
      }

      onCreated(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-slate-100">Novo Cliente</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300">Nome *</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do cliente"
              className="mt-1"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300">Telefone / WhatsApp</label>
            <Input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 90000-0000"
              className="mt-1"
            />
          </div>

          {error && <div className="text-xs text-red-400">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
