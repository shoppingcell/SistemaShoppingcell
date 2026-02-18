import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import CatalogoClient from '@/app/catalogo/CatalogoClient';

export const revalidate = 60;

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured?: boolean | null;
  sheet_code?: string | null;
};

type MediaRow = {
  product_id: string;
  url: string;
};

export default async function CatalogoPage() {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,slug,description,featured,sheet_code')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(120);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-900 px-4 py-12 text-white">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold">Catálogo</h1>
          <p className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
            Erro ao carregar produtos: {error.message}
          </p>
          <Link className="mt-6 inline-block text-blue-300 underline" href="/">
            Voltar
          </Link>
        </div>
      </main>
    );
  }

  const products = (data ?? []) as Product[];

  const { data: media } = await supabase
    .from('product_media')
    .select('product_id,url')
    .eq('is_primary', true);
  const mediaByProductId = new Map(
    (media as MediaRow[] | null | undefined)?.map((m) => [m.product_id, m.url]) ?? [],
  );

  // WhatsApp is handled via n8n webhook (cotação atacado)

  return (
    <main className="min-h-screen bg-black px-4 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)] md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Shopping Cell
              </div>
              <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Catálogo Premium</h1>
              <p className="mt-2 text-sm text-slate-300">
                Peças Apple para atacado. Monte sua lista e peça cotação no WhatsApp.
              </p>
            </div>
            <Link href="/" className="text-sm font-semibold text-slate-200 hover:text-white">
              ← Home
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
            {['Atacado', 'Envio', 'Pronta entrega', 'Cotação rápida'].map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {item}
              </span>
            ))}
          </div>
        </div>

        <CatalogoClient
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            featured: Boolean(p.featured),
            imageUrl: mediaByProductId.get(p.id) ?? null,
            sheet_code: p.sheet_code ?? null,
          }))}
        />

        {products.length === 0 && (
          <p className="mt-10 text-sm text-slate-300">
            Nenhum produto cadastrado ainda. Quando você adicionar produtos no painel, eles aparecem aqui.
          </p>
        )}
      </div>
    </main>
  );
}
