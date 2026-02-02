'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { Button } from '@/app/admin/_components/ui/Button';
import { Input } from '@/app/admin/_components/ui/Input';
import { buildWhatsAppUrl } from '@/app/admin/pedidos/WhatsApp';

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

  const wa = useMemo(() => {
    if (!c?.phone) return null;
    return buildWhatsAppUrl(String(c.phone), `Olá ${String(c.name || '').trim()}!`);
  }, [c?.name, c?.phone]);

  if (loading) return <div className="text-slate-300">Carregando…</div>;
  if (error) return <div className="text-red-200">Erro: {error}</div>;

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Clientes"
        title={c?.name || 'Cliente'}
        subtitle="Editar dados do cliente."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/clientes" className="text-sm font-semibold text-slate-200 hover:text-white">
              ← Voltar
            </Link>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-green-500"
              >
                WhatsApp
              </a>
            )}
            <Button onClick={save}>Salvar</Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome*</div>
                <div className="mt-2">
                  <Input
                    value={c?.name ?? ''}
                    onChange={(e) => setC((v: any) => ({ ...v, name: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">CPF/CNPJ</div>
                <div className="mt-2">
                  <Input
                    value={c?.document ?? ''}
                    onChange={(e) => setC((v: any) => ({ ...v, document: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">WhatsApp</div>
                <div className="mt-2">
                  <Input
                    value={c?.phone ?? ''}
                    onChange={(e) => setC((v: any) => ({ ...v, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</div>
                <div className="mt-2">
                  <Input
                    value={c?.email ?? ''}
                    onChange={(e) => setC((v: any) => ({ ...v, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Observações
                </div>
                <div className="mt-2">
                  <textarea
                    className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                    value={c?.notes ?? ''}
                    onChange={(e) => setC((v: any) => ({ ...v, notes: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {error && <div className="mt-4 text-sm text-red-200">Erro: {error}</div>}
          </div>
        </Panel>

        <Panel>
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-sm font-semibold text-slate-200">Status</div>
          </div>
          <div className="px-6 py-5">
            <label className="flex items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={Boolean(c?.active)}
                onChange={(e) => setC((v: any) => ({ ...v, active: e.target.checked }))}
              />
              Cliente ativo
            </label>
            <div className="mt-4 text-xs text-slate-500">
              Desative para manter no histórico sem aparecer nas seleções.
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
