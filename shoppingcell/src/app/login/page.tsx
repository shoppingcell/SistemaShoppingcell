import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import LoginClient from './LoginClient';

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-black text-white lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-white"><ArrowLeft size={16} /> Voltar ao site</Link>
        <div className="my-auto py-12">
          <div className="mb-8 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400 text-black"><ShieldCheck size={21} /></span><div><div className="font-extrabold">SHOPPING <span className="text-amber-400">CELL</span></div><div className="text-xs text-zinc-600">Acesso seguro da equipe</div></div></div>
          <Suspense><LoginClient /></Suspense>
        </div>
        <p className="text-xs text-zinc-700">Painel exclusivo para usuários autorizados.</p>
      </section>
      <section className="relative hidden min-h-screen overflow-hidden border-l border-white/[0.07] bg-zinc-950 lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero/sequence/frame_026.webp" alt="Componentes internos do iPhone" className="absolute inset-0 h-full w-full object-contain p-16 opacity-75" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#000_0%,transparent_35%),radial-gradient(circle_at_center,transparent_20%,#050505_100%)]" />
        <div className="absolute bottom-14 left-14 max-w-lg"><span className="eyebrow">Gestão integrada</span><h2 className="mt-4 text-4xl font-extrabold tracking-[-0.04em]">Estoque, pedidos e operação em um só painel.</h2></div>
      </section>
    </main>
  );
}
