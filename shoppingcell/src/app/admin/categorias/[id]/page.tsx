'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { slugify } from '@/lib/slugify';

type Category = {
  id: string;
  name: string;
  slug: string;
  sort: number;
};

export default function EditarCategoriaPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [cat, setCat] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('categories')
      .select('id,name,slug,sort')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setCat((data as any) ?? null);
        setLoading(false);
      });
  }, [id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!cat) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from('categories')
      .update({ name: cat.name, slug: cat.slug, sort: cat.sort })
      .eq('id', id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push('/admin/categorias');
    router.refresh();
  }

  async function onDelete() {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push('/admin/categorias');
    router.refresh();
  }

  if (loading) return <div className="text-slate-300">Carregando…</div>;
  if (!cat) return <div className="text-slate-300">Categoria não encontrada.</div>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold">Editar categoria</h1>

      <form onSubmit={onSave} className="mt-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-950 p-6">
        <label className="text-sm text-slate-200">
          Nome
          <input
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            value={cat.name}
            onChange={(e) => setCat({ ...cat, name: e.target.value, slug: slugify(e.target.value) })}
            required
          />
        </label>

        <label className="text-sm text-slate-200">
          Slug
          <input
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            value={cat.slug}
            onChange={(e) => setCat({ ...cat, slug: slugify(e.target.value) })}
          />
        </label>

        <label className="text-sm text-slate-200">
          Ordem
          <input
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            type="number"
            value={cat.sort}
            onChange={(e) => setCat({ ...cat, sort: Number(e.target.value) })}
          />
        </label>

        <div className="flex items-center justify-between">
          <button
            disabled={saving}
            className="rounded-md bg-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
          >
            Salvar
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="rounded-md border border-red-800 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-950/50 disabled:opacity-60"
          >
            Excluir
          </button>
        </div>

        {error && <div className="text-sm text-red-200">{error}</div>}
      </form>
    </div>
  );
}
