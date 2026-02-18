'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { slugify } from '@/lib/slugify';
import { loadSubcategories } from '@/lib/loadSubcategories';
import { slugifySimple } from '@/lib/slugifySimple';

type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  cost_price?: number | null;
  active: boolean;
  category_id: string | null;
  subcategory_id?: string | null;
  featured?: boolean;
};

type Variant = {
  id: string;
  name: string;
  slug: string;
  color_hex: string | null;
  sort: number;
  inventory_variants?: { quantity: number } | null;
};

export default function EditarProdutoPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [p, setP] = useState<Product | null>(null);
  const [priceText, setPriceText] = useState('');
  const [costText, setCostText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Variants (colors)
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantName, setVariantName] = useState('');
  const [variantHex, setVariantHex] = useState('');
  const [variantQty, setVariantQty] = useState('0');
  const [variantBulk, setVariantBulk] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('id,name').order('sort', { ascending: true }),
      supabase
        .from('products')
        .select('id,name,slug,description,price,cost_price,active,category_id,subcategory_id,featured')
        .eq('id', id)
        .single(),
      supabase
        .from('product_variants')
        .select('id,name,slug,color_hex,sort,inventory_variants(quantity)')
        .eq('product_id', id)
        .order('sort', { ascending: true }),
    ]).then(async ([catsRes, prodRes, varsRes]) => {
      setCategories((catsRes.data as any) ?? []);
      if (prodRes.error) setError(prodRes.error.message);
      const data = prodRes.data as any as Product | null;
      setP(data);

      // Variants
      if ((varsRes as any)?.error) {
        // table might not exist yet
        setVariants([]);
      } else {
        setVariants((((varsRes as any)?.data as any) ?? []) as Variant[]);
      }

      try {
        if (data?.category_id) {
          const subs = await loadSubcategories(data.category_id);
          setSubcategories(subs as any);
        }
      } catch {
        // ignore; subcategories might not be enabled yet
        setSubcategories([]);
      }

      setPriceText(data?.price != null ? String(Number(data.price).toFixed(2)) : '');
      setCostText(
        (data as any)?.cost_price != null ? String(Number((data as any).cost_price).toFixed(2)) : '',
      );
      setLoading(false);
    });
  }, [id]);

  async function reloadVariants() {
    const { data, error } = await supabase
      .from('product_variants')
      .select('id,name,slug,color_hex,sort,inventory_variants(quantity)')
      .eq('product_id', id)
      .order('sort', { ascending: true });

    if (error) {
      // table might not exist yet
      setVariants([]);
      return;
    }
    setVariants(((data as any) ?? []) as Variant[]);
  }

  async function addOneVariant(name: string, hex?: string, qty?: number) {
    const cleanName = (name || '').trim();
    if (!cleanName) return;

    // naive sort: append
    const nextSort = (variants?.length ?? 0) * 10;
    const slug = slugifySimple(cleanName);

    const { data: created, error } = await supabase
      .from('product_variants')
      .insert({
        product_id: id,
        name: cleanName,
        slug,
        color_hex: (hex || '').trim() || null,
        sort: nextSort,
        active: true,
      } as any)
      .select('id')
      .single();

    if (error) throw error;

    if (created?.id && qty != null) {
      const q = Number(qty);
      if (!Number.isNaN(q)) {
        await supabase
          .from('inventory_variants')
          .update({ quantity: q } as any)
          .eq('variant_id', created.id);
      }
    }
  }

  async function onAddVariant() {
    try {
      setError(null);
      const q = Number((variantQty || '0').replace(',', '.'));
      await addOneVariant(variantName, variantHex, Number.isNaN(q) ? 0 : q);
      setVariantName('');
      setVariantHex('');
      setVariantQty('0');
      await reloadVariants();
    } catch (e: any) {
      setError(e?.message || 'Erro ao adicionar variação.');
    }
  }

  async function onAddBulk() {
    try {
      setError(null);
      const raw = (variantBulk || '').trim();
      if (!raw) return;
      const parts = raw
        .split(/\n|,/g)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const n of parts) {
        await addOneVariant(n);
      }
      setVariantBulk('');
      await reloadVariants();
    } catch (e: any) {
      setError(e?.message || 'Erro ao adicionar variações em lote.');
    }
  }

  async function onUpdateVariantQty(variantId: string, quantity: number) {
    try {
      setError(null);
      const { error } = await supabase
        .from('inventory_variants')
        .update({ quantity } as any)
        .eq('variant_id', variantId);
      if (error) throw error;
      await reloadVariants();
    } catch (e: any) {
      setError(e?.message || 'Erro ao atualizar estoque da variação.');
    }
  }

  async function onDeleteVariant(variantId: string) {
    if (!confirm('Remover esta variação?')) return;
    try {
      setError(null);
      const { error } = await supabase.from('product_variants').delete().eq('id', variantId);
      if (error) throw error;
      await reloadVariants();
    } catch (e: any) {
      setError(e?.message || 'Erro ao remover variação.');
    }
  }

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
        subcategory_id: (p as any).subcategory_id ?? null,
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
      <PageHeader
        kicker="Produtos"
        title="Editar produto"
        subtitle={`ID: ${p.id}`}
        backHref="/admin/produtos"
        actions={
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
        }
      />

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
            onChange={async (e) => {
              const nextCategory = e.target.value || null;
              setP({ ...p, category_id: nextCategory, subcategory_id: null } as any);
              if (!nextCategory) {
                setSubcategories([]);
                return;
              }
              try {
                const subs = await loadSubcategories(nextCategory);
                setSubcategories(subs as any);
              } catch {
                setSubcategories([]);
              }
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
            value={(p as any).subcategory_id ?? ''}
            onChange={(e) => setP({ ...(p as any), subcategory_id: e.target.value || null })}
            disabled={!p.category_id}
          >
            <option value="">—</option>
            {subcategories.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
          {!p.category_id ? (
            <div className="mt-1 text-xs text-slate-500">Selecione uma categoria primeiro.</div>
          ) : null}
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

        <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950 p-4">
          <div className="text-sm font-semibold text-white">Variações (cores)</div>
          <div className="mt-1 text-xs text-slate-400">
            Estoque por cor (variação). O preço permanece no produto.
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="text-sm text-slate-200">
              Nome da cor
              <input
                className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                placeholder="ex: Preto"
              />
            </label>
            <label className="text-sm text-slate-200">
              HEX (opcional)
              <input
                className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
                value={variantHex}
                onChange={(e) => setVariantHex(e.target.value)}
                placeholder="#000000"
              />
            </label>
            <label className="text-sm text-slate-200">
              Estoque
              <input
                className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
                value={variantQty}
                onChange={(e) => setVariantQty(e.target.value)}
                placeholder="0"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onAddVariant}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Adicionar variação
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="text-sm text-slate-200">
              Adicionar em lote (uma por linha ou separado por vírgula)
              <textarea
                className="mt-1 min-h-[80px] w-full rounded-md bg-slate-900 p-3 text-white"
                value={variantBulk}
                onChange={(e) => setVariantBulk(e.target.value)}
                placeholder="Preto\nBranco\nAzul"
              />
            </label>
            <div>
              <button
                type="button"
                onClick={onAddBulk}
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Adicionar lote
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-300">
                  <th className="py-2">Cor</th>
                  <th className="py-2">HEX</th>
                  <th className="py-2">Estoque</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {variants.length === 0 ? (
                  <tr>
                    <td className="py-3 text-slate-400" colSpan={4}>
                      Nenhuma variação cadastrada.
                    </td>
                  </tr>
                ) : (
                  variants.map((v) => (
                    <tr key={v.id} className="border-t border-slate-800">
                      <td className="py-3 text-white">{v.name}</td>
                      <td className="py-3 text-slate-300">{v.color_hex || '—'}</td>
                      <td className="py-3">
                        <input
                          className="w-24 rounded-md bg-slate-900 p-2 text-white"
                          defaultValue={String(v.inventory_variants?.quantity ?? 0)}
                          onBlur={(e) => {
                            const q = Number(String(e.target.value).replace(',', '.'));
                            onUpdateVariantQty(v.id, Number.isNaN(q) ? 0 : q);
                          }}
                        />
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteVariant(v.id)}
                          className="rounded-md border border-red-800 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-950/50"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
