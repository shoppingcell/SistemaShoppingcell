import Link from 'next/link';

export default function NotAuthorizedAdmin() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Admin</div>
        <h1 className="mt-2 text-2xl font-extrabold">Acesso não autorizado</h1>
        <p className="mt-3 text-sm text-slate-200">
          Seu usuário está logado, mas não está cadastrado como{' '}
          <span className="font-semibold">admin_users</span>.
        </p>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200">
          <div className="font-semibold">Como liberar:</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-300">
            <li>Entre no Supabase → Authentication → Users e copie seu User ID.</li>
            <li>
              Peça para o owner inserir você em <span className="font-semibold">public.admin_users</span>.
            </li>
          </ol>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/login?next=/admin"
            className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-yellow-400"
          >
            Voltar ao login
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white hover:bg-white/10"
          >
            Ir para o site
          </Link>
        </div>
      </div>
    </main>
  );
}
