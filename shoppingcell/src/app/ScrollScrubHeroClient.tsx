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
  // Controls for animation feel
  smoothFactor?: number; // 0..1, higher = faster smoothing of video seek (default 0.22)
  easePower?: number; // easing power applied to open progress (default 1.05)
  throttleSensitivity?: number; // minimal progress delta to update state (default 0.0015)
}) {
  const {
    mp4Src,
    webmSrc,
    posterSrc,
    framesDir,
    frameCount = 0,
    closedSrc,
    finalSrc,
    heightVh = 140,
    stickyTopPx,
    features = [
      { title: 'Tela', desc: 'Peças e módulos premium para reposição.', at: 0.15 },
      { title: 'Bateria', desc: 'Alta demanda e giro no atacado.', at: 0.45 },
      { title: 'Câmera', desc: 'Módulos e componentes selecionados.', at: 0.7 },
      { title: 'Conector', desc: 'Flex e conectores para manutenção.', at: 0.9 },
    ],
    overlayTitle = 'Peças de iPhone no atacado',
    overlaySubtitle = 'Role a página: o iPhone se expande e mostra os detalhes.',
    showCopyFromProgress = 0.12,
    showPinsFromProgress = 0.82,
    // keep the device closed "floating" for the first part of the scroll
    openFromProgress = 0.12,
    smoothFactor = 0.28,
    easePower = 1.05,
    throttleSensitivity = 0.0015,
  } = props;

  const sectionRef = useRef<HTMLElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
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
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const handler = () => setPrefersReducedMotion(mq.matches);
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    }
    return undefined;
  }, []);

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

    // Load first few frames quickly, then progressively load the rest to avoid blocking
    const eagerLoadCount = Math.min(frameCount, 8);
    const loadImg = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });

    (async () => {
      try {
        // eager load first frames
        for (let i = 0; i < eagerLoadCount; i++) {
          if (cancelled) return;
          await loadImg(sources[i]);
          loaded += 1;
          if (loaded >= Math.min(frameCount, 6)) {
            setFramesReady(true);
            setReady(true);
          }
        }

        // progressively load remaining frames in background
        for (let i = eagerLoadCount; i < sources.length; i++) {
          if (cancelled) return;
          // small delay between background loads
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 120));
          // eslint-disable-next-line no-await-in-loop
          await loadImg(sources[i]);
        }
      } catch {
        if (!cancelled) setFramesReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [framesDir, frameCount, finalSrc]);

  // Pause animations when section is not visible (save CPU)
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let mounted = true;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!mounted) return;
        for (const e of entries) {
          if (e.isIntersecting) {
            // resume
            setDidInitialTick((v) => v);
          } else {
            // when not visible, no-op: loops check visibility via getBoundingClientRect
          }
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(section);
    return () => {
      mounted = false;
      obs.disconnect();
    };
  }, []);

  // derive useful computed sources
  const closedImageSrc = closedSrc ?? (framesDir && frameCount ? `${framesDir}/frame_001.jpg` : posterSrc);
  const computedFinalSrc = finalSrc ?? (framesDir && frameCount ? `${framesDir}/frame_${String(frameCount).padStart(3, '0')}.jpg` : finalSrc);

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
      if (Math.abs(p - lastP) > throttleSensitivity) {
        lastP = p;
        setProgress(p);
        setDidInitialTick(true);

        // Keep closed for the first segment, then map to 0..1 for the opening animation
        const rawOpenP = clamp01((p - openFromProgress) / Math.max(1e-6, 1 - openFromProgress));
        const openP = Math.pow(rawOpenP, easePower);

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
      cur = cur + (target - cur) * smoothFactor;
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
        {prefersReducedMotion ? (
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-black shadow-[0_30px_120px_rgba(0,0,0,0.75)]">
            {computedFinalSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={computedFinalSrc} alt="Hero" className="w-full h-auto object-contain" />
            ) : null}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-black shadow-[0_30px_120px_rgba(0,0,0,0.75)]">
            <div className="relative flex h-[60vh] items-center justify-center md:h-[72vh]">
              {closedSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={closedImageSrc}
                  alt="Fechado"
                  onLoad={() => setClosedReady(true)}
                  className="absolute left-1/2 top-1/2 z-10 h-[48vh] w-auto max-w-[360px] -translate-x-1/2 -translate-y-1/2 object-contain md:h-[60vh] md:max-w-[680px]"
                  style={{
                    opacity: clamp01(1 - clamp01(progress / openFromProgress)),
                    transform: `translate(-50%, -50%) scale(${1 + Math.max(0, openFromProgress - progress) * 0.6})`,
                    filter: 'drop-shadow(0 30px 120px rgba(0,0,0,0.75))',
                  }}
                />
              ) : null}

              {computedFinalSrc && progress >= showPinsFromProgress ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={computedFinalSrc}
                  alt="Componentes"
                  className="absolute inset-0 z-30 h-full w-full object-contain"
                  style={{ filter: 'drop-shadow(0 30px 120px rgba(0,0,0,0.75))' }}
                />
              ) : null}
            </div>

            <div
              className="absolute inset-0 flex items-end transition-opacity duration-300"
              style={{
                opacity: progress < showCopyFromProgress ? 0 : progress >= showPinsFromProgress - 0.02 ? 0 : 1,
              }}
            >
              <div className="w-full p-4 md:p-8">
                <div className="mx-auto w-full max-w-4xl px-4 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                    Atacado • Lojistas • Assistências
                  </div>
                  <h1 className="mt-4 text-2xl leading-tight font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
                    {overlayTitle}
                  </h1>
                  <p className="mt-2 text-sm text-slate-200 sm:text-base">{overlaySubtitle}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!prefersReducedMotion && (
          <div className="mx-auto mt-5 max-w-6xl px-2 text-xs text-slate-400">
            Dica: no celular, role devagar para ver a animação com mais suavidade.
          </div>
        )}
      </div>
    </section>
  );
}
