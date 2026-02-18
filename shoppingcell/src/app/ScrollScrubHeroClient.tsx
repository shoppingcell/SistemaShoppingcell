'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

type Feature = {
  title: string;
  desc: string;
  // 0..1 progress range where this feature is active
  at: number;
};

export function ScrollScrubHeroClient(props: {
  // We can scrub either a video OR an image sequence.
  mp4Src?: string;
  webmSrc?: string;
  posterSrc?: string;

  framesDir?: string; // e.g. "/hero/frames"
  frameCount?: number; // e.g. 26

  closedSrc?: string; // image used before the "open" animation starts
  finalSrc?: string; // image used at the end (component diagram)

  heightVh?: number; // total scroll area
  stickyTopPx?: number;
  features?: Feature[];
  overlayTitle?: string;
  overlaySubtitle?: string;
  showCopyFromProgress?: number; // hide copy until progress reaches this point
  showPinsFromProgress?: number; // show pins near the end
  openFromProgress?: number; // start opening animation after this progress
}) {
  const {
    mp4Src,
    webmSrc,
    posterSrc,
    framesDir,
    frameCount = 0,
    closedSrc,
    finalSrc,
    heightVh = 220,
    stickyTopPx,
    features = [
      { title: 'Tela', desc: 'Peças e módulos premium para reposição.', at: 0.15 },
      { title: 'Bateria', desc: 'Alta demanda e giro no atacado.', at: 0.45 },
      { title: 'Câmera', desc: 'Módulos e componentes selecionados.', at: 0.7 },
      { title: 'Conector', desc: 'Flex e conectores para manutenção.', at: 0.9 },
    ],
    overlayTitle = 'Peças de iPhone no atacado',
    overlaySubtitle = 'Role a página: o iPhone se expande e mostra os detalhes.',
    showCopyFromProgress = 0.18,
    showPinsFromProgress = 0.86,
    // keep the device closed "floating" for the first part of the scroll
    openFromProgress = 0.14,
  } = props;

  const sectionRef = useRef<HTMLElement | null>(null);
  const [stickyTop, setStickyTop] = useState<number>(typeof stickyTopPx === 'number' ? stickyTopPx : 96);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);

  const targetTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [ready, setReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [framesReady, setFramesReady] = useState(false);
  const [closedReady, setClosedReady] = useState(!closedSrc);
  const [didInitialTick, setDidInitialTick] = useState(false);

  const sortedFeatures = useMemo(() => [...features].sort((a, b) => a.at - b.at), [features]);

  // Preload frames if using image sequence
  useEffect(() => {
    if (!framesDir || !frameCount || frameCount < 2) {
      return;
    }

    let cancelled = false;
    let loaded = 0;

    const sources: string[] = [];
    for (let i = 1; i <= frameCount; i++) {
      const isLast = i === frameCount;
      // last frame can be overridden via finalSrc
      if (isLast && finalSrc) {
        sources.push(finalSrc);
      } else {
        sources.push(`${framesDir}/frame_${String(i).padStart(3, '0')}.jpg`);
      }
    }

    sources.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        loaded += 1;
        if (loaded >= Math.min(frameCount, 6)) {
          // consider ready after a few frames to avoid blank while waiting all
          setFramesReady(true);
          setReady(true);
        }
      };
      img.onerror = () => {
        if (cancelled) return;
        // If frames fail, we'll fall back to video
        setFramesReady(false);
      };
      img.src = src;
    });

    return () => {
      cancelled = true;
    };
  }, [framesDir, frameCount, finalSrc]);

  // Video metadata (fallback mode)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (framesDir && frameCount && frameCount >= 2) return; // using frames

    const onLoaded = () => {
      const d = Number(video.duration || 0);
      setDuration(d);
      setReady(d > 0);

      try {
        video.currentTime = 0;
      } catch {
        // ignore
      }
    };

    const onError = () => setVideoFailed(true);

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);

    const tryPrime = async () => {
      try {
        video.muted = true;
        await video.play();
        video.pause();
      } catch {
        // ignore
      }
    };

    const onCanPlay = () => {
      tryPrime();
    };
    video.addEventListener('canplay', onCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
      video.removeEventListener('canplay', onCanPlay);
    };
  }, [framesDir, frameCount]);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section) return;

    // Resolve stickyTop: if not provided, read from header css var
    const resolveStickyTop = () => {
      if (typeof stickyTopPx === 'number') return stickyTopPx;
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--site-header-h').trim();
      const n = Number(raw.replace('px', ''));
      return Number.isFinite(n) && n > 0 ? n : 96;
    };

    // Keep stickyTop updated (avoid setState inside rAF loop)
    const applyStickyTop = () => {
      const topPx = resolveStickyTop();
      setStickyTop(topPx);
    };
    applyStickyTop();
    window.addEventListener('resize', applyStickyTop);

    const computeProgress = () => {
      const topPx = resolveStickyTop();
      const viewH = window.innerHeight || 1;
      const y = window.scrollY || document.documentElement.scrollTop || 0;

      // Use rect-based absolute section top (more robust than offsetTop)
      const sectionTopAbs = section.getBoundingClientRect().top + y;
      const sectionH = section.offsetHeight;

      const startY = sectionTopAbs - topPx;
      const endY = sectionTopAbs + sectionH - viewH;
      const denom = Math.max(1, endY - startY);
      return clamp01((y - startY) / denom);
    };

    let rafLoop: number | null = null;
    let rafSeek: number | null = null;
    let lastP = -1;

    const loop = () => {
      rafLoop = window.requestAnimationFrame(loop);
      const p = computeProgress();

      // throttle state updates a bit
      if (Math.abs(p - lastP) > 0.0015) {
        lastP = p;
        setProgress(p);
        setDidInitialTick(true);

        // Keep closed for the first segment, then map to 0..1 for the opening animation
        const openP = clamp01((p - openFromProgress) / Math.max(1e-6, 1 - openFromProgress));

        // Frame mode
        if (framesDir && frameCount && frameCount >= 2) {
          const idx = Math.round(openP * (frameCount - 1));
          setFrameIndex(Math.min(frameCount - 1, Math.max(0, idx)));
        } else if (duration > 0) {
          // even if `ready` is still false, keep target time updated so
          // when metadata arrives we can seek immediately
          const t = Math.min(duration - 0.04, Math.max(0, openP * duration));
          if (Number.isFinite(t)) targetTimeRef.current = t;
        }
      }
    };

    // Smooth seek loop (helps mobile Safari a lot)
    const smooth = () => {
      rafSeek = window.requestAnimationFrame(smooth);

      // No need to smooth-seek when using image frames
      if (framesDir && frameCount && frameCount >= 2) return;
      if (!video) return;
      if (duration <= 0) return;

      const target = targetTimeRef.current;
      let cur = currentTimeRef.current;
      cur = cur + (target - cur) * 0.22;
      if (Math.abs(target - cur) < 0.015) cur = target;

      currentTimeRef.current = cur;
      try {
        video.currentTime = cur;
      } catch {
        // ignore
      }
    };

    // kick
    loop();
    smooth();

    const onResize = () => {
      // force immediate recompute after viewport changes
      lastP = -1;
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('resize', applyStickyTop);
      if (rafLoop != null) window.cancelAnimationFrame(rafLoop);
      if (rafSeek != null) window.cancelAnimationFrame(rafSeek);
    };
  }, [duration, stickyTopPx, ready, framesDir, frameCount, openFromProgress]);

  const activeFeature = useMemo(() => {
    let chosen = sortedFeatures[0];
    for (const f of sortedFeatures) {
      if (progress >= f.at) chosen = f;
    }
    return chosen;
  }, [progress, sortedFeatures]);

  return (
    <section
      ref={sectionRef as any}
      data-initial-tick={didInitialTick ? '1' : '0'}
      data-active-feature={activeFeature?.title || ''}
      className="relative"
      style={{ height: `${heightVh}vh` }}
    >
      <div className="sticky" style={{ top: stickyTop }}>
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-black shadow-[0_30px_120px_rgba(0,0,0,0.75)]">
          {/* poster is used only as <video poster>; we don't render it as a background image */}

          {/* Media (stable height, centered). Start CLOSED, then reveal video as you scroll */}
          <div className="relative flex h-[78svh] items-center justify-center md:h-[80svh]">
            {closedSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={closedSrc}
                alt="Fechado"
                onLoad={() => setClosedReady(true)}
                className="absolute left-1/2 top-1/2 z-10 h-[70vh] w-auto -translate-x-1/2 -translate-y-1/2 object-contain md:h-[72vh]"
                style={{
                  opacity: clamp01(1 - clamp01(progress / openFromProgress)),
                  transform: `translate(-50%, -50%) scale(${1 + Math.max(0, openFromProgress - progress) * 0.9})`,
                  filter: 'drop-shadow(0 30px 120px rgba(0,0,0,0.75))',
                }}
              />
            ) : null}

            {/* Image sequence (preferred) */}
            {framesDir && frameCount && frameCount >= 2 && framesReady ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  finalSrc && frameIndex >= frameCount - 1
                    ? finalSrc
                    : `${framesDir}/frame_${String(frameIndex + 1).padStart(3, '0')}.jpg`
                }
                alt="Hero"
                className="absolute left-1/2 top-1/2 z-10 h-[70vh] w-auto -translate-x-1/2 -translate-y-1/2 object-contain md:h-[72vh]"
                style={{
                  opacity:
                    finalSrc && progress >= showPinsFromProgress
                      ? 0
                      : closedSrc && !closedReady
                        ? 0
                        : closedSrc
                          ? clamp01((progress - openFromProgress * 0.6) / (openFromProgress * 0.4))
                          : 1,
                  filter: 'drop-shadow(0 30px 120px rgba(0,0,0,0.75))',
                }}
              />
            ) : null}

            {/* Video fallback */}
            {!framesDir || !frameCount || frameCount < 2 || !framesReady ? (
              <>
                {/* Poster layer disabled when we have `closedSrc` (otherwise it can look like a second device on iOS) */}
                {posterSrc && !closedSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={posterSrc}
                    alt=""
                    aria-hidden="true"
                    className="absolute left-1/2 top-1/2 z-[9] h-[70vh] w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2 object-contain md:h-[72vh] md:max-w-[680px]"
                    style={{ opacity: ready ? 0 : 1 }}
                  />
                ) : null}

                <video
                  ref={videoRef}
                  className="absolute left-1/2 top-1/2 z-10 h-[70vh] w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2 object-contain md:h-[72vh] md:max-w-[680px]"
                  style={{
                    opacity: finalSrc && progress >= showPinsFromProgress ? 0 : closedSrc ? 1 : 1,
                  }}
                  preload="metadata"
                  muted
                  playsInline
                  controls={false}
                  poster={posterSrc}
                  onError={() => setVideoFailed(true)}
                >
                  {webmSrc ? <source src={webmSrc} type="video/webm" /> : null}
                  {mp4Src ? <source src={mp4Src} type="video/mp4" /> : null}
                </video>
              </>
            ) : null}

            {/* Overlay gradient */}
            <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-black/65 via-black/15 to-black/75" />

            {/* Final frame (component diagram) */}
            {finalSrc && progress >= showPinsFromProgress ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={finalSrc}
                alt="Componentes"
                className="absolute inset-0 z-30 h-full w-full object-contain"
                style={{ filter: 'drop-shadow(0 30px 120px rgba(0,0,0,0.75))' }}
              />
            ) : null}
          </div>

          {/* Nomes no final (sem desenhar novas linhas/pins — a imagem já tem os indicadores) */}
          {progress >= showPinsFromProgress ? (
            <div className="absolute inset-0 z-40">
              <a
                href="/catalogo"
                className="absolute right-6 top-6 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-extrabold text-white backdrop-blur hover:bg-white/10"
              >
                Todos os componentes
              </a>

              {/* Labels (colados nos indicadores) */}
              <a
                href="/componentes/tela"
                className="absolute left-[25%] top-[28%] -translate-x-1/2 -translate-y-full rounded-full bg-black/35 px-3 py-1 text-sm font-semibold text-white backdrop-blur"
                style={{ textShadow: '0 2px 18px rgba(0,0,0,0.85)' }}
              >
                Tela
              </a>

              <a
                href="/componentes/camera-frontal"
                className="absolute left-[78%] top-[16%] -translate-x-1/2 -translate-y-full rounded-full bg-black/35 px-3 py-1 text-sm font-semibold text-white backdrop-blur"
                style={{ textShadow: '0 2px 18px rgba(0,0,0,0.85)' }}
              >
                Câmera Frontal
              </a>

              <a
                href="/componentes/conector"
                className="absolute left-[10%] top-[82%] -translate-x-1/2 rounded-full bg-black/35 px-3 py-1 text-sm font-semibold text-white backdrop-blur"
                style={{ textShadow: '0 2px 18px rgba(0,0,0,0.85)' }}
              >
                Conector de carga
              </a>

              <a
                href="/componentes/bateria"
                className="absolute left-[54%] top-[70%] -translate-x-1/2 rounded-full bg-black/35 px-3 py-1 text-sm font-semibold text-white backdrop-blur"
                style={{ textShadow: '0 2px 18px rgba(0,0,0,0.85)' }}
              >
                Bateria
              </a>

              <a
                href="/componentes/camera-traseira"
                className="absolute left-[83%] top-[64%] -translate-x-1/2 rounded-full bg-black/35 px-3 py-1 text-sm font-semibold text-white backdrop-blur"
                style={{ textShadow: '0 2px 18px rgba(0,0,0,0.85)' }}
              >
                Câmera traseira
              </a>

              {/* Click hotspots (transparent) on the circles */}
              <a
                href="/componentes/tela"
                aria-label="Tela"
                className="absolute left-[25%] top-[33%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full"
              />
              <a
                href="/componentes/camera-frontal"
                aria-label="Câmera Frontal"
                className="absolute left-[78%] top-[22%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full"
              />
              <a
                href="/componentes/conector"
                aria-label="Conector de carga"
                className="absolute left-[10%] top-[74%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full"
              />
              <a
                href="/componentes/bateria"
                aria-label="Bateria"
                className="absolute left-[54%] top-[64%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full"
              />
              <a
                href="/componentes/camera-traseira"
                aria-label="Câmera traseira"
                className="absolute left-[83%] top-[58%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full"
              />
            </div>
          ) : null}

          {/* Copy (só aparece depois de começar a animação; some quando chegam os pins) */}
          <div
            className="absolute inset-0 flex items-end transition-opacity duration-300"
            style={{
              opacity: progress < showCopyFromProgress ? 0 : progress >= showPinsFromProgress - 0.02 ? 0 : 1,
            }}
          >
            <div className="w-full p-6 md:p-10">
              <div className="mx-auto max-w-6xl">
                <div className="grid gap-6 md:grid-cols-2 md:items-end">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200">
                      Atacado • Lojistas • Assistências
                    </div>
                    <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                      {overlayTitle}
                    </h1>
                    <p className="mt-3 text-sm text-slate-200 sm:text-base">{overlaySubtitle}</p>
                  </div>

                  <div className="hidden md:block" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile pins list (no final). Desktop pins ficam sobre o aparelho (dentro do card). */}
        {progress >= showPinsFromProgress ? (
          <div className="mx-auto mt-4 max-w-6xl px-2 md:hidden">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-yellow-300">Componentes</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {sortedFeatures.map((f) => (
                  <a
                    key={f.title}
                    href={`/componentes/${encodeURIComponent(f.title.toLowerCase())}`}
                    className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-center text-sm font-semibold text-slate-100"
                  >
                    {f.title}
                  </a>
                ))}
              </div>
              {videoFailed ? (
                <div className="mt-3 text-xs text-slate-300/80">
                  (Seu navegador pode estar bloqueando o vídeo. A imagem de capa continua funcionando.)
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-5 max-w-6xl px-2 text-xs text-slate-400">
            Dica: no celular, role devagar para ver a animação com mais suavidade.
          </div>
        )}
      </div>
    </section>
  );
}
