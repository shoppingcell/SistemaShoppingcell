'use client';

import { useState } from 'react';

export function SyncSheetsClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/admin/sync-sheets', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao sincronizar com Google Sheets');
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="text-sm font-semibold text-slate-100">Passo 2: Sincronização Manual (Planilha → Supabase)</div>
      <p className="mt-2 text-sm text-slate-300">
        Importa produtos, categorias e estoque diretamente da planilha CSV configurada.
      </p>

      <button
        onClick={handleSync}
        disabled={loading}
        className="mt-4 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-yellow-300 disabled:opacity-50"
      >
        {loading ? 'Sincronizando...' : 'Sincronizar Agora'}
      </button>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-300">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-300">
          <div className="font-semibold">Sincronização concluída com sucesso!</div>
          <div className="mt-2 text-xs text-emerald-200">
            Categorias: {result.synced?.categories ?? 0} | Produtos: {result.synced?.products ?? 0} | Estoque:{' '}
            {result.synced?.inventory ?? 0}
          </div>
        </div>
      )}
    </div>
  );
}
