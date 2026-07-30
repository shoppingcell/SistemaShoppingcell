'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Delete, Lock, Mail, ShieldCheck } from 'lucide-react';

export default function VendedorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
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

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Informe o seu e-mail cadastrado no sistema.');
      return;
    }

    if (pin.length < 4) {
      setError('Digite sua senha PIN de 4 a 6 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/vendedor/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, pin }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'E-mail ou PIN incorretos. Tente novamente.');
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
          <p className="mt-1 text-xs font-bold text-slate-400">Portal do Vendedor (Login E-mail + PIN)</p>
        </div>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          {/* Email Field */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400">E-mail do Vendedor</label>
            <div className="relative mt-1.5">
              <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@shoppingcell.tech"
                required
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder-slate-500 focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </div>

          {/* PIN Display Dots */}
          <div>
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
              Digite sua Senha PIN (4 a 6 dígitos)
            </div>
            <div className="mt-2.5 flex justify-center gap-3">
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
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-center text-xs font-bold text-red-200">
              {error}
            </div>
          )}

          {/* Mobile Touch Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl font-black text-white shadow-lg transition active:scale-95 hover:bg-white/10"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={handleDelete}
              className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400 transition active:scale-95 hover:bg-white/10 hover:text-white"
            >
              <Delete size={20} />
            </button>

            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl font-black text-white shadow-lg transition active:scale-95 hover:bg-white/10"
            >
              0
            </button>

            <button
              type="submit"
              disabled={loading || !email || pin.length < 4}
              className="flex h-12 items-center justify-center rounded-2xl bg-yellow-400 text-xs font-black uppercase text-slate-950 shadow-xl transition active:scale-95 disabled:opacity-40 hover:bg-yellow-300"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </div>
        </form>

        <div className="mt-5 text-center text-[11px] text-slate-500">
          Solicite seu e-mail e PIN de acesso ao Administrador da loja.
        </div>
      </div>
    </div>
  );
}
