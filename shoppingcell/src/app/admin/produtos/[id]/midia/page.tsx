'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Trash2 } from 'lucide-react';

type Media = {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  sort: number;
  is_primary: boolean;
};

const MEDIA_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET || 'product-media';
const isVideoUrl = (value?: string | null) => Boolean(value && /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(value));

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

  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const primaryId = useMemo(() => items.find((i) => i.is_primary)?.id ?? null, [items]);

  async function refreshPublicPages() {
    const response = await fetch(`/api/admin/products/${productId}`, { method: 'POST' });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      setError(result?.error || 'A mídia foi salva, mas a página pública pode levar até um minuto para atualizar.');
      return false;
    }
    return true;
  }

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

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setFilePreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  async function onAddUrl(e: React.FormEvent) {
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
    await refreshPublicPages();
    router.refresh();
    setSaving(false);
  }

  async function onUploadFile(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setSaving(true);
    setError(null);

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `products/${productId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;

    const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
      cacheControl: '3600',
    });

    if (uploadError) {
      setError(uploadError.message);
      setSaving(false);
      return;
    }

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    const publicUrl = data.publicUrl;

    const { error: insertError } = await supabase.from('product_media').insert({
      product_id: productId,
      url: publicUrl,
      alt: alt.trim() || null,
      sort: items.length,
      is_primary: items.length === 0,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setFile(null);
    setAlt('');
    await load();
    await refreshPublicPages();
    router.refresh();
    setSaving(false);
  }

  async function setPrimary(id: string) {
    setSaving(true);
    setError(null);

    const updates = items.map((m) => ({ id: m.id, is_primary: m.id === id }));

    for (const u of updates) {
      const { error } = await supabase
        .from('product_media')
        .update({ is_primary: u.is_primary })
        .eq('id', u.id);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    await load();
    await refreshPublicPages();
    router.refresh();
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Remover esta mídia?')) return;
    setSaving(true);
    setError(null);

    const { data: deleted, error } = await supabase.from('product_media').delete().eq('id', id).select('id').single();
    if (error || !deleted?.id) {
      setError(error?.message || 'Não foi possível confirmar a exclusão da mídia.');
      setSaving(false);
      return;
    }

    await load();
    await refreshPublicPages();
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        kicker="Produtos"
        title="Mídia do produto"
        subtitle={
          <>
            Adicione por URL ou envie imagem/vídeo do celular ou PC (upload para o bucket{' '}
            <span className="font-mono">{MEDIA_BUCKET}</span>).
          </>
        }
        backHref={`/admin/produtos/${productId}`}
      />

      <div className="mt-6 grid gap-4">
        <form onSubmit={onAddUrl} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-6">
          <div className="text-sm font-semibold text-slate-100">Adicionar por URL</div>
          <label className="text-sm text-slate-200">
            URL da imagem ou vídeo
            <input
              className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="text-sm text-slate-200">
            Texto alternativo (alt)
            <input
              className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
            />
          </label>
          <button
            disabled={saving}
            className="rounded-md bg-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
          >
            Adicionar URL
          </button>
        </form>

        <form
          onSubmit={onUploadFile}
          className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-6"
        >
          <div className="text-sm font-semibold text-slate-100">Enviar imagem ou vídeo (celular/PC)</div>

          <label className="text-sm text-slate-200">
            Arquivo
            <input
              className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white file:mr-4 file:rounded-md file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-200 hover:file:bg-slate-700"
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={saving}
            />
          </label>

          {filePreviewUrl && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
              <div className="text-xs text-slate-400">Prévia</div>
              {file?.type.startsWith('video/') ? (
                <video src={filePreviewUrl} controls muted playsInline className="mt-2 h-44 w-full rounded-md bg-black object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={filePreviewUrl} alt={alt || 'Prévia'} className="mt-2 h-44 w-auto max-w-full rounded-md object-contain" />
              )}
              <div className="mt-2 text-xs text-slate-400">{file?.name}</div>
            </div>
          )}

          <label className="text-sm text-slate-200">
            Texto alternativo (alt)
            <input
              className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
            />
          </label>

          <button
            disabled={saving || !file}
            className="rounded-md bg-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
          >
            Enviar mídia
          </button>

          <div className="text-xs text-slate-400">
            Observação: o bucket precisa existir no Supabase e estar com política de upload liberada para o
            usuário logado.
          </div>
        </form>

        {error && <div className="text-sm text-red-200">{error}</div>}
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="text-sm font-semibold">Itens ({items.length})</div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-300">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="mt-4 text-sm text-slate-400">Nenhuma mídia cadastrada.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {items.map((m) => (
              <div
                key={m.id}
                className="grid min-w-0 gap-3 rounded-xl border border-slate-800 bg-slate-900/30 p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center"
              >
                <div className="h-20 w-20 overflow-hidden rounded-lg border border-slate-800 bg-slate-900/50">
                  {isVideoUrl(m.url) ? (
                    <video src={m.url} muted playsInline preload="metadata" className="h-full w-full object-contain" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.alt ?? 'Mídia'} className="h-full w-full object-contain" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-yellow-400">{isVideoUrl(m.url) ? 'Vídeo' : 'Imagem'}</div>
                  <div className="mt-1 truncate text-sm text-slate-200" title={m.url}>{m.url}</div>
                  <div className="mt-1 text-xs text-slate-400">{m.alt ?? 'Sem texto alternativo'}</div>
                </div>
                <div className="flex min-w-0 flex-col gap-2 border-t border-slate-800 pt-3 sm:col-span-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setPrimary(m.id)}
                    className={`min-h-11 rounded-lg px-4 py-2 text-xs font-semibold sm:min-w-36 ${
                      m.id === primaryId
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {m.id === primaryId ? 'Principal' : 'Definir principal'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => remove(m.id)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-xs font-bold text-red-200 hover:bg-red-900/50 disabled:opacity-60 sm:min-w-36"
                  >
                    <Trash2 size={15} /> Excluir mídia
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
