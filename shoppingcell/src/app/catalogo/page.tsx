import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import CatalogoClient from '@/app/catalogo/CatalogoClient';

export const revalidate = 60;

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price_cents: number;
  featured?: boolean | null;
};

type MediaRow = {
  product_id: string;
  url: string;
};

export default async function CatalogoPage() {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,slug,description,base_price_cents,featured')
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

  const whatsappE164 = process.env.NEXT_PUBLIC_WHATSAPP_E164 || '+559492814167';

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">Catálogo</h1>
            <p className="mt-2 text-sm text-slate-300">Peças Apple com qualidade premium.</p>
          </div>
          <Link href="/" className="text-sm text-slate-200 hover:text-white">
            ← Home
          </Link>
        </div>

        <CatalogoClient
          whatsappE164={whatsappE164}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            base_price_cents: p.base_price_cents,
            featured: Boolean(p.featured),
            imageUrl: mediaByProductId.get(p.id) ?? null,
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
