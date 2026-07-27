"use client";

import Link from 'next/link';
import React from 'react';

export function HomeFeaturedClient({ products }: { products: Array<any> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {products.map((p) => (
        <Link
          key={p.id}
          href={`/produto/${p.slug}`}
          className="group flex flex-col items-start gap-2 rounded-2xl border border-white/6 bg-white/5 p-3 text-sm hover:shadow-md"
        >
          <div className="h-28 w-full overflow-hidden rounded-lg bg-slate-800">
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">Sem imagem</div>
            )}
          </div>

          <div className="w-full">
            <div className="truncate font-semibold text-slate-100">{p.name}</div>
            <div className="mt-1 text-xs text-slate-400">{p.sheet_code ?? ''}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default HomeFeaturedClient;
