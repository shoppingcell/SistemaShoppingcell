'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { slugify } from '@/lib/slugify';

type Category = { id: string; name: string };

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  cost_price?: number | null;
  active: boolean;
  category_id: string | null;
  featured?: boolean;
};

export default function EditarProdutoPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [p, setP] = useState<Product | null>(null);
  const [priceText, setPriceText] = useState('');
  const [costText, setCostText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('id,name').order('sort', { ascending: true }),
      supabase
        .from('products')
        .select('id,name,slug,description,price,cost_price,active,category_id,featured')
        .eq('id', id)
        .single(),
    ]).then(([catsRes, prodRes]) => {
      setCategories((catsRes.data as any) ?? []);
      if (prodRes.error) setError(prodRes.error.message);
      const data = prodRes.data as any as Product | null;
      setP(data);
      setPriceText(data?.price != null ? String(Number(data.price).toFixed(2)) : '');
      setCostText(
        (data as any)?.cost_price != null ? String(Number((data as any).cost_price).toFixed(2)) : '',
      );
      setLoading(false);
    });
  }, [id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!p) return;

    setSaving(true);
    setError(null);

    const parsedPrice = priceText.trim() ? Number(priceText.replace(',', '.')) : null;
    const parsedCost = costText.trim() ? Number(costText.replace(',', '.')) : null;

    const { error } = await supabase
      .from('products')
      .update({
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: parsedPrice,
        cost_price: parsedCost,
        // Auto-lock (admin override) when edited
        price_locked: true,
        cost_locked: true,
        active: p.active,
        category_id: p.category_id,
        featured: Boolean((p as any).featured),
      } as any)
      .eq('id', id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.refresh();
    setSaving(false);
  }

  async function onDelete() {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push('/admin/produtos');
    router.refresh();
  }

  if (loading) return <div className="text-slate-300">Carregando…</div>;
  if (!p) return <div className="text-slate-300">Produto não encontrado.</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Editar produto</h1>
          <p className="mt-1 text-sm text-slate-300">ID: {p.id}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/admin/produtos/${id}/midia`}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
          >
            Mídia
          </Link>
          <Link
            href={`/admin/produtos/${id}/estoque`}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
          >
            Estoque
          </Link>
        </div>
      </div>

      <form onSubmit={onSave} className="mt-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-950 p-6">
        <label className="text-sm text-slate-200">
          Nome
          <input
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            value={p.name}
            onChange={(e) => setP({ ...p, name: e.target.value, slug: slugify(e.target.value) })}
            required
          />
        </label>

        <label className="text-sm text-slate-200">
          Slug
          <input
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            value={p.slug}
            onChange={(e) => setP({ ...p, slug: slugify(e.target.value) })}
          />
        </label>

        <label className="text-sm text-slate-200">
          Categoria
          <select
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            value={p.category_id ?? ''}
            onChange={(e) => setP({ ...p, category_id: e.target.value || null })}
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-200">
            Preço (R$)
            <input
              className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              placeholder="ex: 129.90"
            />
            <div className="mt-1 text-xs text-slate-500">Ao salvar, este campo fica travado (manual).</div>
          </label>

          <label className="text-sm text-slate-200">
            Custo (R$)
            <input
              className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
              value={costText}
              onChange={(e) => setCostText(e.target.value)}
              placeholder="ex: 89.90"
            />
            <div className="mt-1 text-xs text-slate-500">Ao salvar, este campo fica travado (manual).</div>
          </label>
        </div>

        <label className="text-sm text-slate-200">
          Descrição
          <textarea
            className="mt-1 min-h-[120px] w-full rounded-md bg-slate-900 p-3 text-white"
            value={p.description ?? ''}
            onChange={(e) => setP({ ...p, description: e.target.value || null })}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={p.active}
              onChange={(e) => setP({ ...p, active: e.target.checked })}
            />
            Ativo
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={Boolean((p as any).featured)}
              onChange={(e) => setP({ ...p, featured: e.target.checked } as any)}
            />
            Destaque (Catálogo)
          </label>
        </div>

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
