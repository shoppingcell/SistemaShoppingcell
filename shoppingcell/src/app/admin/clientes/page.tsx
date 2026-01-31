import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id,name,document,phone,email,active,created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clientes</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">Gestão de clientes (atacado e relacionamento).</p>
        </div>

        <Link
          href="/admin/clientes/novo"
          className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-sm hover:bg-yellow-300"
        >
          + Novo Cliente
        </Link>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <div className="font-semibold">Erro ao carregar clientes</div>
          <div className="mt-1 opacity-90">{error.message}</div>
          <div className="mt-3 text-xs opacity-80">
            Rode o SQL: <code>supabase/admin_patch_customers.sql</code>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-950/60 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">Clientes</div>
              <div className="text-xs text-slate-400">{(customers ?? []).length} cadastrados</div>
            </div>
          </div>

          {(customers ?? []).length === 0 ? (
            <div className="grid place-items-center px-6 py-16 text-center">
              <div className="text-sm text-slate-400">Nenhum cliente encontrado</div>
              <Link
                href="/admin/clientes/novo"
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-yellow-300"
              >
                + Adicionar Cliente
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4">Nome</th>
                    <th className="px-6 py-4">Documento</th>
                    <th className="px-6 py-4">WhatsApp</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(customers ?? []).map((c: any) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-6 py-4 font-semibold text-slate-100">{c.name}</td>
                      <td className="px-6 py-4 text-slate-300">{c.document ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-300">{c.phone ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-300">{c.email ?? '—'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            'rounded-full px-3 py-1 text-xs font-semibold ' +
                            (c.active ? 'bg-green-500/15 text-green-300' : 'bg-slate-500/15 text-slate-300')
                          }
                        >
                          {c.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/clientes/${c.id}`}
                          className="font-semibold text-yellow-300 hover:text-yellow-200"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
