'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

type Media = {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  sort: number;
  is_primary: boolean;
};

export default function MidiaProdutoPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const router = useRouter();

  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');

  const primaryId = useMemo(() => items.find((i) => i.is_primary)?.id ?? null, [items]);

  async function load() {
    setError(null);
    setLoading(true);
    const { data, error } = await supabase
      .from('product_media')
      .select('id,product_id,url,alt,sort,is_primary')
      .eq('product_id', productId)
      .order('sort', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    setItems((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from('product_media').insert({
      product_id: productId,
      url: url.trim(),
      alt: alt.trim() || null,
      sort: items.length,
      is_primary: items.length === 0,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setUrl('');
    setAlt('');
    await load();
    router.refresh();
    setSaving(false);
  }

  async function setPrimary(id: string) {
    setSaving(true);
    setError(null);

    const updates = items.map((m) => ({ id: m.id, is_primary: m.id === id }));

    for (const u of updates) {
      const { error } = await supabase.from('product_media').update({ is_primary: u.is_primary }).eq('id', u.id);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    await load();
    router.refresh();
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Remover esta mídia?')) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase.from('product_media').delete().eq('id', id);
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await load();
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold">Mídia do produto</h1>
      <p className="mt-1 text-sm text-slate-300">Adicione imagens por URL (por enquanto). Depois fazemos upload direto no bucket.</p>

      <form onSubmit={onAdd} className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-6">
        <label className="text-sm text-slate-200">
          URL da imagem
          <input
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>
        <label className="text-sm text-slate-200">
          Texto alternativo (alt)
          <input className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white" value={alt} onChange={(e) => setAlt(e.target.value)} />
        </label>
        <button
          disabled={saving}
          className="rounded-md bg-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
        >
          Adicionar
        </button>
        {error && <div className="text-sm text-red-200">{error}</div>}
      </form>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="text-sm font-semibold">Itens ({items.length})</div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-300">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="mt-4 text-sm text-slate-400">Nenhuma mídia cadastrada.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {items.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-slate-200">{m.url}</div>
                  <div className="text-xs text-slate-400">{m.alt ?? '—'}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    disabled={saving}
                    onClick={() => setPrimary(m.id)}
                    className={`rounded-md px-3 py-2 text-xs font-semibold ${
                      m.id === primaryId ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {m.id === primaryId ? 'Principal' : 'Definir principal'}
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => remove(m.id)}
                    className="rounded-md bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-950/50"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
