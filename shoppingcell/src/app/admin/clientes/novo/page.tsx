'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { Button } from '@/app/admin/_components/ui/Button';
import { Input } from '@/app/admin/_components/ui/Input';

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
      <PageHeader
        kicker="Clientes"
        title="Novo cliente"
        subtitle="Cadastre um cliente para pedidos e relacionamento."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/clientes" className="text-sm font-semibold text-slate-200 hover:text-white">
              ← Voltar
            </Link>
            <Button onClick={save} disabled={saving}>
              Salvar
            </Button>
          </div>
        }
      />

      <Panel>
        <div className="px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome*</div>
              <div className="mt-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Assistência X"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">CPF/CNPJ</div>
              <div className="mt-2">
                <Input
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="opcional"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">WhatsApp</div>
              <div className="mt-2">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ex: 5594999999999"
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">Pode colar com símbolos, eu limpo.</div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</div>
              <div className="mt-2">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opcional" />
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observações</div>
              <div className="mt-2">
                <textarea
                  className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ex: condições especiais, entrega, etc."
                />
              </div>
            </div>
          </div>

          {error && <div className="mt-4 text-sm text-red-200">Erro: {error}</div>}
        </div>
      </Panel>
    </div>
  );
}
