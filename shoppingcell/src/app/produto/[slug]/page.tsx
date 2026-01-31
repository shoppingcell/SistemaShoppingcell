import Link from 'next/link';
import { notFound } from 'next/navigation';
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

type Media = {
  id: string;
  type: 'image' | 'video';
  url: string;
  position: number;
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
    .select('id,type,url,position')
    .eq('product_id', p.id)
    .order('position', { ascending: true });

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_E164;
  const msg = `Olá! Tenho interesse no produto: ${p.name} (ShoppingCell). Pode me passar mais detalhes?`;
  const waUrl = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}` : '#';

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/catalogo" className="text-sm text-slate-200 hover:text-white">
          ← Voltar ao catálogo
        </Link>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <h1 className="text-3xl font-extrabold">{p.name}</h1>
          <div className="mt-2 text-lg font-bold text-yellow-400">{formatBRLFromCents(p.base_price_cents)}</div>

          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-300">{p.description ?? '—'}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Pedir orçamento no WhatsApp
            </a>
            <Link
              href="/contato"
              className="rounded-md bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Falar com a equipe
            </Link>
          </div>

          <div className="mt-8 grid gap-3">
            {(media as Media[] | null)?.map((m) => (
              <div key={m.id} className="overflow-hidden rounded-xl border border-slate-800">
                {m.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={p.name} className="h-auto w-full" />
                ) : (
                  <video controls className="h-auto w-full">
                    <source src={m.url} />
                  </video>
                )}
              </div>
            ))}

            {(!media || media.length === 0) && (
              <p className="text-sm text-slate-400">Sem mídia cadastrada para este produto ainda.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
