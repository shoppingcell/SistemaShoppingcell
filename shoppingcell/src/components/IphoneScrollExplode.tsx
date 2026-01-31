'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Piece = {
  key: string;
  title: string;
  desc: string;
  // relative position in the phone frame (0..1)
  x: number;
  y: number;
  // when it appears (0..1 scroll progress)
  at: number;
};

function clamp(n: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, n));
}

export default function IphoneScrollExplode() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  const pieces: Piece[] = useMemo(
    () => [
      { key: 'camera', title: 'Câmeras', desc: 'Módulos premium e compatibilidade garantida.', x: 0.68, y: 0.16, at: 0.15 },
      { key: 'screen', title: 'Tela', desc: 'Brilho e sensibilidade com padrão de qualidade.', x: 0.5, y: 0.46, at: 0.35 },
      { key: 'battery', title: 'Bateria', desc: 'Mais autonomia com segurança e procedência.', x: 0.38, y: 0.68, at: 0.55 },
      { key: 'connector', title: 'Conector', desc: 'Troca rápida e encaixe perfeito.', x: 0.62, y: 0.82, at: 0.72 },
    ],
    [],
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let raf = 0;

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const viewportH = window.innerHeight;
        // progress: 0 when section top hits bottom; 1 when section bottom hits top
        const total = rect.height - viewportH;
        const p = total <= 0 ? 1 : clamp((-rect.top) / total);
        setProgress(p);
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Phone animation
  const scale = 0.7 + progress * 0.55; // 0.7 -> 1.25
  const rotate = 14 - progress * 22; // 14deg -> -8deg
  const lift = 40 - progress * 80; // down -> slightly up
  const glow = 0.2 + progress * 0.6;

  return (
    <section ref={rootRef} className="relative bg-slate-900">
      {/* Tall scroll area */}
      <div className="reparos-scroll h-[420vh]">
        <div className="sticky top-0 flex min-h-screen items-center justify-center overflow-hidden px-4">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

          {/* Headline */}
          <div className="pointer-events-none absolute left-0 right-0 top-24 mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1 text-xs text-slate-200">
                Peças premium para revenda
              </div>
              <h2 className="mt-4 text-3xl font-extrabold text-white md:text-5xl">
                Seu iPhone merece o <span className="text-blue-400">original</span>.
              </h2>
              <p className="mt-3 text-sm text-slate-300 md:text-base">
                Role para ver os componentes em destaque e depois explore nosso catálogo com preços, descrição, imagens e vídeos.
              </p>
            </div>
          </div>

          {/* Phone stage */}
          <div className="relative z-10 mx-auto w-full max-w-6xl">
            <div className="relative mx-auto aspect-[9/16] w-[240px] md:w-[360px]">
              <div
                className="absolute inset-0 rounded-[2.5rem] border border-slate-700/70 bg-slate-950 shadow-2xl"
                style={{
                  transform: `translateY(${lift}px) rotate(${rotate}deg) scale(${scale})`,
                  transformOrigin: '50% 50%',
                  boxShadow: `0 30px 120px rgba(59,130,246,${glow})`,
                }}
              >
                {/* Notch */}
                <div className="absolute left-1/2 top-3 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-900" />

                {/* Screen content */}
                <div className="absolute inset-3 rounded-[2rem] bg-gradient-to-b from-slate-800 to-slate-950">
                  <div className="flex h-full flex-col items-center justify-center text-slate-200">
                    <div className="text-4xl font-extrabold">SC</div>
                    <div className="mt-2 text-xs text-slate-400">ShoppingCell</div>
                  </div>
                </div>

                {/* piece markers */}
                {pieces.map((piece) => {
                  const local = clamp((progress - piece.at) / 0.18);
                  const opacity = local;
                  const pop = 1 + (1 - local) * 0.2;
                  const px = `${piece.x * 100}%`;
                  const py = `${piece.y * 100}%`;
                  return (
                    <div
                      key={piece.key}
                      className="absolute"
                      style={{
                        left: px,
                        top: py,
                        transform: `translate(-50%, -50%) scale(${pop})`,
                        opacity,
                      }}
                    >
                      <div className="h-3 w-3 rounded-full bg-yellow-400 shadow-[0_0_0_6px_rgba(250,204,21,0.15)]" />
                    </div>
                  );
                })}
              </div>

              {/* Side cards */}
              <div className="pointer-events-none absolute left-[calc(100%+24px)] top-0 hidden w-[320px] space-y-3 md:block">
                {pieces.map((piece) => {
                  const local = clamp((progress - piece.at) / 0.18);
                  return (
                    <div
                      key={piece.key}
                      className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 backdrop-blur"
                      style={{
                        opacity: local,
                        transform: `translateX(${(1 - local) * 18}px)`,
                      }}
                    >
                      <div className="text-sm font-semibold text-white">{piece.title}</div>
                      <div className="mt-1 text-xs text-slate-300">{piece.desc}</div>
                    </div>
                  );
                })}
              </div>

              <div className="pointer-events-none absolute right-[calc(100%+24px)] bottom-0 hidden w-[320px] md:block">
                <div
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300"
                  style={{ opacity: clamp((progress - 0.05) / 0.2) }}
                >
                  Próximo passo: puxar esses itens do Supabase e permitir editar no Admin.
                </div>
              </div>
            </div>
          </div>

          {/* Scroll hint */}
          <div className="pointer-events-none absolute bottom-10 left-0 right-0 flex items-center justify-center">
            <div className="rounded-full border border-slate-700 bg-slate-950/40 px-4 py-2 text-xs text-slate-200">
              Role para ver o efeito ({Math.round(progress * 100)}%)
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
