'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

function onlyDigits(s: string) {
  return (s || '').replace(/\D/g, '');
}

export default function NovoClientePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaving(true);

    if (!name.trim()) {
      setError('Nome é obrigatório.');
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: name.trim(),
        document: document.trim() || null,
        phone: onlyDigits(phone) || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
        active: true,
      } as any)
      .select('id')
      .single();

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push(`/admin/clientes/${data.id}`);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clientes</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Novo Cliente</h1>
          <p className="mt-1 text-sm text-slate-500">Cadastre um cliente para pedidos e relacionamento.</p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-sm hover:bg-yellow-300 disabled:opacity-60"
        >
          Salvar
        </button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-200">
            Nome*
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Assistência X"
            />
          </label>

          <label className="text-sm text-slate-200">
            CPF/CNPJ
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="opcional"
            />
          </label>

          <label className="text-sm text-slate-200">
            WhatsApp
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="ex: 5594999999999"
            />
            <div className="mt-1 text-xs text-slate-500">Pode colar com símbolos, eu limpo.</div>
          </label>

          <label className="text-sm text-slate-200">
            Email
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="opcional"
            />
          </label>

          <label className="text-sm text-slate-200 md:col-span-2">
            Observações
            <textarea
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex: condições especiais, entrega, etc."
            />
          </label>
        </div>

        {error && <div className="mt-4 text-sm text-red-200">Erro: {error}</div>}
      </div>
    </div>
  );
}
