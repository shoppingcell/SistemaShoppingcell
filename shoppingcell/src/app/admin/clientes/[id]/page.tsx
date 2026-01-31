'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

function onlyDigits(s: string) {
  return (s || '').replace(/\D/g, '');
}

export default function ClienteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [c, setC] = useState<any>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setC(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save() {
    if (!c?.name?.trim()) {
      setError('Nome é obrigatório.');
      return;
    }

    setError(null);
    const { error } = await supabase
      .from('customers')
      .update({
        name: String(c.name || '').trim(),
        document: String(c.document || '').trim() || null,
        phone: onlyDigits(String(c.phone || '')) || null,
        email: String(c.email || '').trim() || null,
        notes: String(c.notes || '').trim() || null,
        active: Boolean(c.active),
      } as any)
      .eq('id', id);

    if (error) {
      setError(error.message);
      return;
    }

    await load();
    router.refresh();
  }

  if (loading) return <div className="text-slate-600">Carregando…</div>;
  if (error) return <div className="text-red-600">Erro: {error}</div>;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clientes</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{c?.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Editar dados do cliente.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={save}
            className="rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-sm hover:bg-yellow-300"
          >
            Salvar
          </button>
          <button
            onClick={() => {
              router.push('/admin/clientes');
              router.refresh();
            }}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Voltar
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-200">
            Nome*
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500"
              value={c?.name ?? ''}
              onChange={(e) => setC((v: any) => ({ ...v, name: e.target.value }))}
            />
          </label>

          <label className="text-sm text-slate-200">
            CPF/CNPJ
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500"
              value={c?.document ?? ''}
              onChange={(e) => setC((v: any) => ({ ...v, document: e.target.value }))}
            />
          </label>

          <label className="text-sm text-slate-200">
            WhatsApp
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500"
              value={c?.phone ?? ''}
              onChange={(e) => setC((v: any) => ({ ...v, phone: e.target.value }))}
            />
          </label>

          <label className="text-sm text-slate-200">
            Email
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500"
              value={c?.email ?? ''}
              onChange={(e) => setC((v: any) => ({ ...v, email: e.target.value }))}
            />
          </label>

          <label className="text-sm text-slate-200 md:col-span-2">
            Observações
            <textarea
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500"
              value={c?.notes ?? ''}
              onChange={(e) => setC((v: any) => ({ ...v, notes: e.target.value }))}
            />
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={Boolean(c?.active)}
              onChange={(e) => setC((v: any) => ({ ...v, active: e.target.checked }))}
            />
            Cliente ativo
          </label>
        </div>

        {error && <div className="mt-4 text-sm text-red-200">Erro: {error}</div>}
      </div>
    </div>
  );
}
