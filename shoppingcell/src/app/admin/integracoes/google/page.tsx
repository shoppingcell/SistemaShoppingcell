import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function GoogleIntegracaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = typeof sp.status === 'string' ? sp.status : null;
  const refresh = typeof sp.refresh_token === 'string' ? sp.refresh_token : null;
  const msg = typeof sp.msg === 'string' ? sp.msg : null;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold">Integração: Google Sheets</h1>
      <p className="mt-1 text-sm text-slate-400">Conectar para permitir atualizar estoque na planilha automaticamente.</p>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="text-sm font-semibold">Passo 1: conectar</div>
        <p className="mt-2 text-sm text-slate-300">
          Clique em “Conectar” e autorize o acesso à sua planilha. Depois copie o <code>refresh_token</code> e cole no servidor.
        </p>

        <div className="mt-4 flex gap-3">
          <Link
            href="/api/google/oauth/start"
            className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
          >
            Conectar
          </Link>
        </div>

        {status && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-200">
            <div className="font-semibold">Status: {status}</div>
            {msg && <div className="mt-2 text-slate-300">{msg}</div>}
            {refresh && (
              <div className="mt-3">
                <div className="text-xs text-slate-400">Refresh token (copie e me mande / cole no .env):</div>
                <pre className="mt-2 overflow-auto rounded-lg bg-black/40 p-3 text-xs">{refresh}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-300">
        <div className="font-semibold">Observação</div>
        <p className="mt-2">
          Seu OAuth Client precisa ter a Redirect URI cadastrada como:
          <code className="ml-2 text-slate-200">https://vendedoria.xyz/api/google/oauth/callback</code>
        </p>
      </div>
    </div>
  );
}
