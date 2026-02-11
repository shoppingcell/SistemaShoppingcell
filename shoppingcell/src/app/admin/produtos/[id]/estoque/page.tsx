'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

type InventoryRow = { product_id: string; quantity: number; min_quantity?: number };

type Move = {
  id: string;
  delta: number;
  reason: string | null;
  created_at: string;
};

export default function EstoqueProdutoPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const router = useRouter();

  const [inv, setInv] = useState<InventoryRow | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [delta, setDelta] = useState<string>('');
  const [reason, setReason] = useState('');
  const [minQty, setMinQty] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);

    const [{ data: invData, error: invErr }, { data: mvData, error: mvErr }] = await Promise.all([
      supabase
        .from('inventory')
        .select('product_id,quantity,min_quantity')
        .eq('product_id', productId)
        .maybeSingle(),
      supabase
        .from('inventory_moves')
        .select('id,delta,reason,created_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (invErr) setError(invErr.message);
    if (mvErr) setError(mvErr.message);

    setInv((invData as any) ?? null);
    setMinQty(invData?.min_quantity != null ? String(invData.min_quantity) : '0');
    setMoves((mvData as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function ensureInventoryRow() {
    const { data } = await supabase
      .from('inventory')
      .select('product_id,quantity,min_quantity')
      .eq('product_id', productId)
      .maybeSingle();
    if (data) return;
    await supabase.from('inventory').insert({ product_id: productId, quantity: 0, min_quantity: 0 } as any);
  }

  async function applyMove(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) {
      setError('Delta inválido. Use um número diferente de 0.');
      setSaving(false);
      return;
    }

    await ensureInventoryRow();

    const { data: sessionRes } = await supabase.auth.getSession();
    const userId = sessionRes.session?.user?.id ?? null;

    const { error: moveErr } = await supabase.from('inventory_moves').insert({
      product_id: productId,
      user_id: userId,
      delta: d,
      reason: reason.trim() || null,
    });

    if (moveErr) {
      setError(moveErr.message);
      setSaving(false);
      return;
    }

    // Update inventory quantity
    const { data: invRow } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
      .single();
    const current = Number((invRow as any)?.quantity ?? 0);

    const { error: invUpdErr } = await supabase
      .from('inventory')
      .update({ quantity: current + d, updated_at: new Date().toISOString() } as any)
      .eq('product_id', productId);

    if (invUpdErr) {
      setError(invUpdErr.message);
      setSaving(false);
      return;
    }

    setDelta('');
    setReason('');
    await load();
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold">Estoque</h1>
      <p className="mt-1 text-sm text-slate-300">Controle simples de quantidade e movimentações.</p>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-6">
        <div className="text-sm text-slate-300">Quantidade atual</div>
        <div className="mt-1 text-3xl font-extrabold">{loading ? '…' : (inv?.quantity ?? 0)}</div>
      </div>

      <div className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-200 md:col-span-1">
            Estoque mínimo
            <input
              className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
              value={minQty}
              onChange={(e) => setMinQty(e.target.value)}
              placeholder="ex: 5"
            />
            <div className="mt-1 text-xs text-slate-500">Ao salvar, este campo fica travado (manual).</div>
          </label>

          <form onSubmit={applyMove} className="grid gap-3 md:col-span-2">
            <label className="text-sm text-slate-200 md:col-span-1">
              Delta (+/-)
              <input
                className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="ex: 10 ou -2"
              />
            </label>
            <label className="text-sm text-slate-200 md:col-span-2">
              Motivo
              <input
                className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ex: compra fornecedor / remessa / ajuste"
              />
            </label>

            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <button
                type="button"
                onClick={async () => {
                  setError(null);
                  setSaving(true);
                  await ensureInventoryRow();
                  const parsed = Number(minQty);
                  const { error: minErr } = await supabase
                    .from('inventory')
                    .update({ min_quantity: Number.isFinite(parsed) ? parsed : 0, min_locked: true } as any)
                    .eq('product_id', productId);
                  if (minErr) setError(minErr.message);
                  await load();
                  router.refresh();
                  setSaving(false);
                }}
                disabled={saving}
                className="rounded-md border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Salvar estoque mínimo
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
              >
                Aplicar movimentação
              </button>
            </div>
          </form>
        </div>

        {error && <div className="text-sm text-red-200">{error}</div>}
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="text-sm font-semibold">Últimas movimentações</div>
        {loading ? (
          <div className="mt-4 text-sm text-slate-300">Carregando…</div>
        ) : moves.length === 0 ? (
          <div className="mt-4 text-sm text-slate-400">Nenhuma movimentação ainda.</div>
        ) : (
          <div className="mt-4 grid gap-2">
            {moves.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/30 p-3"
              >
                <div className="text-sm text-slate-200">
                  <span className={m.delta > 0 ? 'text-green-400' : 'text-red-300'}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </span>
                  <span className="ml-3 text-slate-400">{m.reason ?? '—'}</span>
                </div>
                <div className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString('pt-BR')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
