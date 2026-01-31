'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

export default function LoginClient() {
  const sp = useSearchParams();
  const nextPath = useMemo(() => sp.get('next') || '/admin', [sp]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Avoid redirect loops: the browser can have a cached session while the server cookies are missing.
    // We show a button instead of auto-redirecting.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    window.location.href = nextPath;
  }

  async function onMagicLink() {
    setStatus(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${nextPath}`,
      },
    });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus('Link enviado. Verifique seu e-mail.');
    }
    setLoading(false);
  }

  async function onClearSession() {
    setStatus(null);
    setLoading(true);
    await supabase.auth.signOut();
    setHasSession(false);
    setLoading(false);
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <h1 className="text-2xl font-extrabold">Login</h1>
      <p className="mt-2 text-sm text-slate-300">Acesse o painel administrativo.</p>

      {hasSession && (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-200">
          <div className="font-semibold">Você já tem uma sessão salva neste navegador.</div>
          <div className="mt-1 text-slate-300">Se estiver em loop, limpe a sessão e faça login novamente.</div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => (window.location.href = nextPath)}
              className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold hover:bg-slate-700"
            >
              Ir para o Admin
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onClearSession}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold hover:bg-slate-900"
            >
              Limpar sessão
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <label className="text-sm text-slate-200">
          E-mail
          <input
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="text-sm text-slate-200">
          Senha
          <input
            className="mt-1 w-full rounded-md bg-slate-900 p-3 text-white"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button
          disabled={loading}
          className="mt-2 rounded-md bg-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
        >
          Entrar
        </button>

        <button
          type="button"
          disabled={loading || !email}
          onClick={onMagicLink}
          className="rounded-md border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          Enviar link por e-mail (sem senha)
        </button>

        {status && <p className="text-sm text-slate-200">{status}</p>}

        <p className="text-xs text-slate-500">Dica: você pode usar senha ou login por link (OTP).</p>
      </form>
    </div>
  );
}
