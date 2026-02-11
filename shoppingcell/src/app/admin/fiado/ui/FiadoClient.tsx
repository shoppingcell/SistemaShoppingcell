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
  customer?: { name?: string | null; phone?: string | null } | null;
};

function money(n: number) {
  return `R$ ${Number(n || 0).toFixed(2)}`;
}

export function FiadoClient({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<null | { id: string; remaining: number }>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const name = String(r.customer?.name || '').toLowerCase();
      const phone = String(r.customer?.phone || '').toLowerCase();
      const id = String(r.id).toLowerCase();
      return name.includes(term) || phone.includes(term) || id.includes(term);
    });
  }, [rows, q]);

  return (
    <div>
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-200">Lista</div>
            <div className="mt-1 text-xs text-slate-500">{filtered.length} registros</div>
          </div>
          <div className="w-full md:w-80">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome/telefone…" />
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
                    <Button
                      variant="ghost"
                      disabled={remaining <= 0}
                      onClick={() => {
                        setError(null);
                        setAmount(String(remaining.toFixed(2)));
                        setNote('');
                        setModal({ id: r.id, remaining });
                      }}
                    >
                      Receber
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
