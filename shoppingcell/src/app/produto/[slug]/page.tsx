import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { formatBRLFromCents } from '@/lib/formatPrice';
import ProductClient from '@/app/produto/[slug]/ProductClient';

export const revalidate = 60;

type Media = {
  id: string;
  url: string;
  alt: string | null;
  sort: number;
  is_primary: boolean;
};

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { data: p, error } = await supabase
    .from('products')
    .select('id,name,slug,description,base_price_cents')
    .eq('slug', params.slug)
    .eq('active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!p) return notFound();

  const { data: media } = await supabase
    .from('product_media')
    .select('id,url,alt,sort,is_primary')
    .eq('product_id', p.id)
    .order('is_primary', { ascending: false })
    .order('sort', { ascending: true });

  const whatsappE164 = process.env.NEXT_PUBLIC_WHATSAPP_E164 || '+559492814167';

  const imgs = (media as Media[] | null | undefined) ?? [];

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/catalogo" className="text-sm text-slate-200 hover:text-white">
          ← Voltar ao catálogo
        </Link>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          <div className="border-b border-slate-800 p-6">
            <h1 className="text-3xl font-extrabold">{p.name}</h1>
            <div className="mt-2 text-lg font-bold text-yellow-400">
              {formatBRLFromCents(p.base_price_cents)}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm text-slate-300">{p.description ?? '—'}</p>

            <ProductClient product={p as any} whatsappE164={whatsappE164} />
          </div>

          <div className="p-6">
            <div className="grid gap-3">
              {imgs.map((m) => (
                <div
                  key={m.id}
                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.alt ?? p.name} className="h-auto w-full" />
                </div>
              ))}

              {imgs.length === 0 && (
                <p className="text-sm text-slate-400">Sem mídia cadastrada para este produto ainda.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
