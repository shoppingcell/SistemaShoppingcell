'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

export default function LoginClient() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const raw = searchParams.get('next') || '/admin';
    return raw.startsWith('/') && !raw.startsWith('//') && !raw.toLowerCase().startsWith('/\\') ? raw : '/admin';
  }, [searchParams]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session))); }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setStatus(error.message); setLoading(false); return; }
    window.location.href = nextPath;
  }

  async function onForgotPassword() {
    if (!email) return;
    setStatus(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
    setStatus(error ? error.message : 'E-mail de recuperação enviado. Verifique sua caixa de entrada e o spam.');
    setLoading(false);
  }

  async function onClearSession() {
    setLoading(true);
    await supabase.auth.signOut();
    setHasSession(false);
    setStatus('Sessão local removida. Faça login novamente.');
    setLoading(false);
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="text-4xl font-extrabold tracking-[-0.04em]">Entrar no painel</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">Use suas credenciais para acessar a operação da Shopping Cell.</p>

      {hasSession && (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-100">
          <div className="font-bold">Existe uma sessão salva neste navegador.</div>
          <p className="mt-1 text-xs leading-5 text-amber-200/70">Você pode continuar ou limpar a sessão se o acesso estiver em loop.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={loading} onClick={() => (window.location.href = nextPath)} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-bold text-black hover:bg-amber-300">Continuar</button>
            <button type="button" disabled={loading} onClick={onClearSession} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">Limpar sessão</button>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 grid gap-4">
        <label className="text-sm font-semibold text-zinc-300">E-mail
          <input className="field mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="voce@shoppingcell.com.br" />
        </label>
        <label className="text-sm font-semibold text-zinc-300">Senha
          <input className="field mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="Sua senha" />
        </label>
        <button disabled={loading} className="button-primary mt-2 px-5 py-3.5 text-sm disabled:opacity-60">{loading ? 'Aguarde…' : 'Entrar'}</button>
        <button type="button" disabled={loading || !email} onClick={onForgotPassword} className="button-secondary px-5 py-3.5 text-sm disabled:opacity-40">Esqueci minha senha</button>
        {status && <p className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-300">{status}</p>}
      </form>
    </div>
  );
}
