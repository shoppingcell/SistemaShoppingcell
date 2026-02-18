'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { slugify } from '@/lib/slugify';

type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };

export default function NovoProdutoPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('categories')
      .select('id,name')
      .order('sort', { ascending: true })
      .then(({ data }) => setCategories((data as any) ?? []));
  }, []);

  useEffect(() => {
    // Load subcategories for the selected category (if any)
    const cat = categoryId || '__none__';

    supabase
      .from('subcategories')
      .select('id,name,category_id')
      .eq('category_id', cat)
      .order('sort', { ascending: true })
      .then(({ data }) => setSubcategories((data as any) ?? []));
  }, [categoryId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const finalSlug = slug || slugify(name);
    const parsedPrice = price.trim() ? Number(price.replace(',', '.')) : null;

    const { data, error } = await supabase
      .from('products')
      .insert({
        name,
        slug: finalSlug,
        description: description || null,
        category_id: categoryId || null,
        subcategory_id: subcategoryId || null,
        price: parsedPrice,
        price_locked: true,
        active,
        featured,
      } as any)
      .select('id')
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/admin/produtos/${data.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold">Novo produto</h1>
      <p className="mt-1 text-sm text-slate-300">Cadastre um produto simples (sem variações por enquanto).</p>

      <form
        onSubmit={onSubmit}
        className="mt-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-950 p-6"
      >
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
          />
        </label>

        <label className="text-sm text-slate-200">
          Categoria
          <select
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId('');
            }}
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-200">
          Subcategoria
          <select
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            disabled={!categoryId}
          >
            <option value="">—</option>
            {subcategories.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
          {!categoryId ? (
            <div className="mt-1 text-xs text-slate-500">Selecione uma categoria primeiro.</div>
          ) : null}
        </label>

        <label className="text-sm text-slate-200">
          Preço (R$)
          <input
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="ex: 129.90"
          />
        </label>

        <label className="text-sm text-slate-200">
          Descrição
          <textarea
            className="mt-1 min-h-[120px] w-full rounded-md bg-slate-900 p-3 text-white"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição curta do produto"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativo
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Destaque (Catálogo)
          </label>
        </div>

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
