'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { slugify } from '@/lib/slugify';

export default function NovaCategoriaPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sort, setSort] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const finalSlug = slug || slugify(name);

    const { error } = await supabase.from('categories').insert({ name, slug: finalSlug, sort });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/admin/categorias');
    router.refresh();
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold">Nova categoria</h1>
      <p className="mt-1 text-sm text-slate-300">Crie uma categoria para organizar o catálogo.</p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-950 p-6">
        <label className="text-sm text-slate-200">
          Nome
          <input
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }}
            required
          />
        </label>

        <label className="text-sm text-slate-200">
          Slug
          <input
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="ex: iphone-11"
          />
        </label>

        <label className="text-sm text-slate-200">
          Ordem
          <input
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            type="number"
            value={sort}
            onChange={(e) => setSort(Number(e.target.value))}
          />
        </label>

        <button
          disabled={loading}
          className="rounded-md bg-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
        >
          Salvar
        </button>

        {error && <div className="text-sm text-red-200">{error}</div>}
      </form>
    </div>
  );
}
