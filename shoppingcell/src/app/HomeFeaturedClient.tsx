'use client';

import Link from 'next/link';
import { ArrowUpRight, Package, Play } from 'lucide-react';

type Product = { id: string; name: string; slug: string; imageUrl?: string | null; sheet_code?: string | null };
const isVideo = (url?: string | null) => Boolean(url && /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(url));

export function HomeFeaturedClient({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {products.map((product) => (
        <Link key={product.id} href={`/produto/${product.slug}`} className="group surface surface-hover overflow-hidden">
          <div className="relative aspect-square overflow-hidden bg-black">
            {product.imageUrl ? (
              isVideo(product.imageUrl) ? (
                <video src={product.imageUrl} muted playsInline loop autoPlay preload="metadata" className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-105 sm:p-5" aria-label={`Vídeo de ${product.name}`} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-5 transition duration-500 group-hover:scale-105" />
              )
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-700"><Package size={34} /></div>
            )}
            {isVideo(product.imageUrl) && <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/75 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white backdrop-blur"><Play size={10} fill="currentColor" /> Vídeo</span>}
            <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/60 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"><ArrowUpRight size={16} /></span>
          </div>
          <div className="border-t border-white/[0.07] p-4 sm:p-5">
            {product.sheet_code ? <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">Cód. {product.sheet_code}</div> : null}
            <div className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-zinc-100 sm:text-base">{product.name}</div>
            <div className="mt-3 text-xs font-semibold text-zinc-500 group-hover:text-zinc-300">Solicitar cotação</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default HomeFeaturedClient;
