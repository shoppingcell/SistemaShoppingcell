'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/admin/sync-sheets', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setStatus(`Erro: ${json.error || res.status}`);
      } else {
        setStatus(`OK: ${json.synced.products} produtos, ${json.synced.categories} categorias, ${json.synced.inventory} estoques.`);
        // Ensure server components refetch
        router.refresh();
      }
    } catch (e: any) {
      setStatus(`Erro: ${e?.message || 'falha'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={sync}
        disabled={loading}
        className="rounded-md bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700 disabled:opacity-60"
      >
        {loading ? 'Sincronizando…' : 'Sincronizar planilha'}
      </button>
      {status && <div className="text-xs text-slate-300">{status}</div>}
    </div>
  );
}
