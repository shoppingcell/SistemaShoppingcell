'use client';

import { ImageIcon, Play } from 'lucide-react';
import { useState } from 'react';

type Media = { id: string; url: string; alt: string | null; sort: number; is_primary: boolean };
const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(url);

export function ProductMediaGallery({ items, productName }: { items: Media[]; productName: string }) {
  const [activeId, setActiveId] = useState(items[0]?.id || '');
  const active = items.find((item) => item.id === activeId) || items[0];

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-zinc-950">
      <div className="relative flex aspect-square items-center justify-center bg-black p-4 sm:p-8">
        {active ? (
          isVideo(active.url) ? (
            <video key={active.id} src={active.url} controls muted playsInline preload="metadata" className="h-full w-full object-contain" aria-label={active.alt || `Vídeo de ${productName}`} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active.url} alt={active.alt || productName} className="h-full w-full object-contain" />
          )
        ) : <ImageIcon size={54} className="text-zinc-800" />}
        {active && (
          <span className="pointer-events-none absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
            {isVideo(active.url) ? <Play size={11} fill="currentColor" /> : <ImageIcon size={12} />}
            {isVideo(active.url) ? 'Vídeo do produto' : 'Imagem do produto'}
          </span>
        )}
      </div>
      {items.length > 1 && (
        <div className="border-t border-white/[0.07] p-3 sm:p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Escolha o que deseja visualizar</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {items.map((item, index) => {
              const video = isVideo(item.url);
              const typeIndex = items.slice(0, index + 1).filter((entry) => isVideo(entry.url) === video).length;
              return (
                <button key={item.id} type="button" onClick={() => setActiveId(item.id)} aria-label={`Abrir ${video ? 'vídeo' : 'imagem'} ${typeIndex} de ${productName}`} className={`w-24 shrink-0 overflow-hidden rounded-xl border bg-black text-left transition ${active?.id === item.id ? 'border-amber-400 ring-1 ring-amber-400/25' : 'border-white/10 hover:border-white/30'}`}>
                  <span className="relative block h-20 overflow-hidden">
                    {video ? <><video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-contain p-1" /><span className="absolute inset-0 grid place-items-center bg-black/20"><Play size={18} fill="currentColor" /></span></> : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt={item.alt || productName} className="h-full w-full object-contain p-1" />
                    )}
                  </span>
                  <span className={`flex items-center justify-center gap-1.5 border-t px-2 py-2 text-[10px] font-extrabold uppercase tracking-wider ${active?.id === item.id ? 'border-amber-400/30 bg-amber-400 text-black' : 'border-white/[0.07] text-zinc-400'}`}>
                    {video ? <Play size={10} fill="currentColor" /> : <ImageIcon size={11} />}
                    {video ? 'Vídeo' : 'Imagem'} {typeIndex}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
