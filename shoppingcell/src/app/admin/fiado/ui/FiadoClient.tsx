'use client';

import { useMemo, useState } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { Input } from '@/app/admin/_components/ui/Input';
import { Button } from '@/app/admin/_components/ui/Button';
import { Modal } from '@/app/admin/_components/ui/Modal';

type Row = {
  id: string;
  sale_id: string;
  customer_id: string;
  total: number;
  paid: number;
  status: string;
  due_date: string | null;
  created_at: string;
  customer?: { name?: string | null; phone?: string | null; is_walkin?: boolean | null } | null;
};

type PaymentRow = {
  id: string;
  receivable_id: string;
  amount: number;
  paid_at: string;
  note: string | null;
};

function money(n: number) {
  return `R$ ${Number(n || 0).toFixed(2)}`;
}

export function FiadoClient({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'all' | 'balcao' | 'cadastrados'>('all');
  const [modal, setModal] = useState<null | { id: string; remaining: number; customerName?: string | null }>(
    null,
  );
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (scope === 'balcao') return Boolean(r.customer?.is_walkin);
        if (scope === 'cadastrados') return !r.customer?.is_walkin;
        return true;
      })
      .filter((r) => {
        if (!term) return true;
        const name = String(r.customer?.name || '').toLowerCase();
        const phone = String(r.customer?.phone || '').toLowerCase();
        const id = String(r.id).toLowerCase();
        return name.includes(term) || phone.includes(term) || id.includes(term);
      });
  }, [rows, q, scope]);

  return (
    <div>
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-200">Lista</div>
            <div className="mt-1 text-xs text-slate-500">{filtered.length} registros</div>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={
                  'rounded-full px-3 py-2 text-xs font-extrabold ' +
                  (scope === 'all'
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                }
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setScope('cadastrados')}
                className={
                  'rounded-full px-3 py-2 text-xs font-extrabold ' +
                  (scope === 'cadastrados'
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                }
              >
                Cadastrados
              </button>
              <button
                type="button"
                onClick={() => setScope('balcao')}
                className={
                  'rounded-full px-3 py-2 text-xs font-extrabold ' +
                  (scope === 'balcao'
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-950 text-slate-300 hover:bg-white/5')
                }
              >
                Balcão
              </button>
            </div>

            <div className="w-full md:w-80">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome/telefone…"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr className="border-b border-white/10">
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Venc.</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Pago</th>
              <th className="px-6 py-4">Restante</th>
              <th className="px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const remaining = Math.max(0, Number(r.total || 0) - Number(r.paid || 0));
              return (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="font-extrabold text-slate-100">{r.customer?.name || '—'}</div>
                    <div className="mt-1 text-xs text-slate-500">{r.customer?.phone || '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-200">
                    {r.due_date ? new Date(r.due_date).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-200">{String(r.status || '').toUpperCase()}</td>
                  <td className="px-6 py-4 font-extrabold text-yellow-300">{money(r.total)}</td>
                  <td className="px-6 py-4 text-slate-200">{money(r.paid)}</td>
                  <td className="px-6 py-4 text-slate-200">{money(remaining)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          setError(null);
                          setDetailsId(r.id);
                          setPayments(null);
                          setLoadingPayments(true);
                          try {
                            const { data, error } = await supabase
                              .from('receivable_payments')
                              .select('id,receivable_id,amount,paid_at,note')
                              .eq('receivable_id', r.id)
                              .order('paid_at', { ascending: false });
                            if (error) throw error;
                            setPayments((data as any) ?? []);
                          } catch (e: any) {
                            setError(e?.message || 'Falha ao carregar histórico.');
                            setPayments([]);
                          } finally {
                            setLoadingPayments(false);
                          }
                        }}
                      >
                        Histórico
                      </Button>

                      <Button
                        variant="ghost"
                        disabled={remaining <= 0}
                        onClick={() => {
                          setError(null);
                          setAmount(String(remaining.toFixed(2)));
                          setNote('');
                          setModal({ id: r.id, remaining, customerName: r.customer?.name ?? null });
                        }}
                      >
                        Receber
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={!!detailsId} title="Histórico" onClose={() => setDetailsId(null)}>
        <div className="grid gap-3">
          <div className="text-xs text-slate-400">Últimos recebimentos deste fiado.</div>

          {loadingPayments ? (
            <div className="text-sm text-slate-300">Carregando…</div>
          ) : payments && payments.length > 0 ? (
            <div className="grid gap-2">
              {payments.map((p) => (
                <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-extrabold text-slate-100">
                      {money(Number(p.amount || 0))}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(p.paid_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  {p.note ? <div className="mt-1 text-xs text-slate-300">{p.note}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Nenhum pagamento registrado ainda.
            </div>
          )}

          {error && <div className="text-sm text-red-200">{error}</div>}
        </div>
      </Modal>

      <Modal open={!!modal} title="Receber fiado" onClose={() => setModal(null)}>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            (async () => {
              if (!modal) return;
              setSaving(true);
              setError(null);
              try {
                const v = Number(amount.replace(',', '.'));
                if (!Number.isFinite(v) || v <= 0) throw new Error('Valor inválido.');

                const { error } = await supabase.rpc('pdv_receive_fiado_payment', {
                  p_receivable_id: modal.id,
                  p_amount: v,
                  p_note: note.trim() || null,
                } as any);

                if (error) throw error;

                window.location.reload();
              } catch (err: any) {
                setError(err?.message || 'Falha ao receber.');
              } finally {
                setSaving(false);
              }
            })();
          }}
        >
          <div className="text-xs text-slate-400">
            Recebendo em dinheiro/PIX no caixa (registra pagamento parcial).
          </div>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} />

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Observação (opcional)
          </label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ex: PIX, dinheiro, etc."
          />

          {error && <div className="text-sm text-red-200">{error}</div>}

          <Button disabled={saving} type="submit">
            Confirmar recebimento
          </Button>
        </form>
      </Modal>
    </div>
  );
}
