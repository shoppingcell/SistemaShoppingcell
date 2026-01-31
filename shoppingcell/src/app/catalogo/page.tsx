import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { formatBRLFromCents } from '@/lib/formatPrice';

export const revalidate = 60;

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price_cents: number;
};

export default async function CatalogoPage() {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,slug,description,base_price_cents')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(60);

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

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/produto/${p.slug}`}
              className="rounded-xl border border-slate-800 bg-slate-950 p-5 hover:border-slate-600"
            >
              <div className="text-lg font-semibold">{p.name}</div>
              <div className="mt-2 text-sm text-slate-300 line-clamp-2">
                {p.description ?? '—'}
              </div>
              <div className="mt-4 text-base font-bold text-yellow-400">
                {formatBRLFromCents(p.base_price_cents)}
              </div>
            </Link>
          ))}
        </div>

        {products.length === 0 && (
          <p className="mt-10 text-sm text-slate-300">
            Nenhum produto cadastrado ainda. Quando você adicionar produtos no painel, eles aparecem aqui.
          </p>
        )}
      </div>
    </main>
  );
}
