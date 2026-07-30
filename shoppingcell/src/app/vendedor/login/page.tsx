'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Delete, Lock, ShieldCheck } from 'lucide-react';

export default function VendedorLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleKeyPress(num: string) {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setError(null);
    }
  }

  function handleDelete() {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  }

  async function handleLogin() {
    if (pin.length < 4) {
      setError('Digite seu PIN de 4 a 6 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/vendedor/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'PIN incorreto. Tente novamente.');
        setPin('');
        return;
      }

      // Save seller session in localStorage for mobile fast access
      localStorage.setItem('sc_seller_session', JSON.stringify(data.seller));
      router.push('/vendedor');
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-8 text-slate-100">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-2xl">
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
            <Lock size={28} />
          </div>
          <h1 className="mt-3 text-xl font-black tracking-wide text-white">SHOPPING CELL</h1>
          <p className="mt-1 text-xs font-bold text-slate-400">Portal do Vendedor (Mobile)</p>
        </div>

        {/* PIN Display Dots */}
        <div className="my-6">
          <div className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
            Digite seu PIN de Acesso
          </div>
          <div className="mt-3 flex justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={
                  'h-4 w-4 rounded-full border transition-all duration-200 ' +
                  (idx < pin.length
                    ? 'scale-110 border-yellow-400 bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]'
                    : 'border-white/20 bg-white/5')
                }
              />
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-center text-xs font-bold text-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Mobile Numeric Touch Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl font-black text-white shadow-lg transition active:scale-95 hover:bg-white/10"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={handleDelete}
            className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400 transition active:scale-95 hover:bg-white/10 hover:text-white"
          >
            <Delete size={22} />
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl font-black text-white shadow-lg transition active:scale-95 hover:bg-white/10"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading || pin.length < 4}
            className="flex h-14 items-center justify-center rounded-2xl bg-yellow-400 text-xs font-black uppercase text-slate-950 shadow-xl transition active:scale-95 disabled:opacity-40 hover:bg-yellow-300"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-500">
          Solicite seu PIN ao Administrador se ainda não possui.
        </div>
      </div>
    </div>
  );
}
