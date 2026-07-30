'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Box, Camera, Smartphone, Zap } from 'lucide-react';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

type Feature = { title: string; desc: string; at: number };

export function ScrollScrubHeroClient({
  framesDir = '/hero/higgsfield-sequence',
  frameCount = 49,
  fallbackFramesDir = '/hero/sequence',
  fallbackFrameCount = 26,
  frameExtension = 'webp',
  heightVh = 260,
  openFromProgress = 0.08,
  overlayTitle = 'Peças que movimentam o seu negócio.',
  overlaySubtitle = 'Role para explorar a estrutura de um iPhone e descobrir o padrão Shopping Cell.',
  features = [
    { title: 'Tela', desc: 'Módulos selecionados para reposição profissional.', at: 0.18 },
    { title: 'Bateria', desc: 'Peças de alto giro para assistências e lojistas.', at: 0.42 },
    { title: 'Câmeras', desc: 'Componentes frontais e traseiros para manutenção.', at: 0.66 },
    { title: 'Conectores', desc: 'Flex e conectores para completar o seu estoque.', at: 0.84 },
  ],
}: {
  framesDir?: string;
  frameCount?: number;
  fallbackFramesDir?: string;
  fallbackFrameCount?: number;
  frameExtension?: string;
  heightVh?: number;
  openFromProgress?: number;
  overlayTitle?: string;
  overlaySubtitle?: string;
  features?: Feature[];
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [sequenceFallback, setSequenceFallback] = useState(false);

  const effectiveFrameCount = sequenceFallback ? fallbackFrameCount : frameCount;

  const frameSrc = useCallback(
    (index: number) => `${sequenceFallback ? fallbackFramesDir : framesDir}/frame_${String(index + 1).padStart(3, '0')}.${frameExtension}`,
    [fallbackFramesDir, frameExtension, framesDir, sequenceFallback],
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReducedMotion(media.matches);
    syncMotion();
    media.addEventListener?.('change', syncMotion);
    return () => media.removeEventListener?.('change', syncMotion);
  }, []);

  useEffect(() => {
    const eager = Array.from({ length: Math.min(8, effectiveFrameCount) }, (_, index) => frameSrc(index));
    let done = 0;
    let cancelled = false;
    eager.forEach((src) => {
      const image = new Image();
      const finish = () => {
        done += 1;
        if (!cancelled && done >= Math.min(3, eager.length)) setLoaded(true);
      };
      image.onload = finish;
      image.onerror = () => {
        if (!sequenceFallback && !cancelled) setSequenceFallback(true);
        finish();
      };
      image.src = src;
    });

    const preloadRest = window.setTimeout(() => {
      for (let index = eager.length; index < effectiveFrameCount; index += 1) {
        const image = new Image();
        image.src = frameSrc(index);
      }
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(preloadRest);
    };
  }, [effectiveFrameCount, frameSrc, sequenceFallback]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let raf = 0;

    const update = () => {
      const rect = section.getBoundingClientRect();
      const scrollable = Math.max(1, rect.height - window.innerHeight);
      setProgress(clamp(-rect.top / scrollable));
      raf = 0;
    };

    const requestUpdate = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const openProgress = reducedMotion ? 1 : clamp((progress - openFromProgress) / (1 - openFromProgress));
  const easedProgress = 1 - Math.pow(1 - openProgress, 2.2);
  const frameIndex = Math.min(effectiveFrameCount - 1, Math.round(easedProgress * (effectiveFrameCount - 1)));
  const activeFeature = useMemo(() => {
    let current = features[0];
    for (const feature of features) if (progress >= feature.at) current = feature;
    return current;
  }, [features, progress]);

  const icons = [Smartphone, Zap, Camera, Box];

  return (
    <section ref={sectionRef} className="relative bg-black" style={{ height: `${heightVh}vh` }} aria-label="Exploração das peças">
      <div className="sticky top-0 h-screen overflow-hidden bg-black">
        <div className="relative mx-auto grid h-full max-w-[1500px] items-center px-5 pt-20 lg:grid-cols-[0.78fr_1.22fr] lg:px-10">
          <div
            className="relative z-20 max-w-xl self-end pb-24 transition-all duration-500 lg:self-center lg:pb-0"
            style={{ opacity: progress > 0.88 ? 0 : 1, transform: `translateY(${progress * -18}px)` }}
          >
            <span className="eyebrow">Atacado para lojistas e assistências</span>
            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.02] tracking-[-0.05em] text-white sm:text-6xl xl:text-7xl">
              {overlayTitle}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg">{overlaySubtitle}</p>

            <div className="mt-8 hidden items-center gap-3 text-sm font-semibold text-zinc-400 sm:flex">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5">
                <ArrowDown size={18} />
              </span>
              Role para desmontar
            </div>
          </div>

          <div className="absolute inset-x-0 top-2 flex h-[72vh] items-center justify-center lg:relative lg:inset-auto lg:h-[88vh]">
            <div className="animate-float-soft flex w-full justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={frameSrc(reducedMotion ? effectiveFrameCount - 1 : frameIndex)}
                alt="iPhone desmontado com indicação de tela, câmeras, bateria e conector"
                onLoad={() => setLoaded(true)}
                onError={() => {
                  if (!sequenceFallback) setSequenceFallback(true);
                }}
                className={`relative z-10 h-auto w-[115vw] max-w-[850px] scale-125 select-none object-contain transition-all duration-300 sm:w-[105vw] lg:w-full lg:max-w-[1150px] lg:scale-120 xl:scale-125 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                draggable={false}
              />
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute bottom-6 left-1/2 z-30 w-[calc(100%-2rem)] max-w-4xl transition-all duration-300"
          style={{ opacity: progress > 0.16 && progress < 0.9 ? 1 : 0, transform: `translate(-50%, ${progress > 0.16 ? 0 : 16}px)` }}
        >
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/70 p-3 shadow-2xl backdrop-blur-xl sm:p-4">
            {(() => {
              const index = Math.max(0, features.indexOf(activeFeature));
              const Icon = icons[index % icons.length];
              return <Icon className="shrink-0 text-amber-400" size={24} />;
            })()}
            <div>
              <div className="font-bold text-white">{activeFeature.title}</div>
              <div className="text-sm text-zinc-400">{activeFeature.desc}</div>
            </div>
            <div className="ml-auto hidden text-xs font-semibold tabular-nums text-zinc-500 sm:block">
              {String(frameIndex + 1).padStart(2, '0')} / {effectiveFrameCount}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 h-1 bg-amber-400 transition-[width]" style={{ width: `${progress * 100}%` }} />
      </div>
    </section>
  );
}
