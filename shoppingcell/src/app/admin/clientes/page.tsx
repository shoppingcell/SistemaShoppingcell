import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { buildWhatsAppUrl } from '@/app/admin/pedidos/WhatsApp';

export const dynamic = 'force-dynamic';

export default async function ClientesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: 'all' | 'active' | 'inactive' }>;
}) {
  const supabase = await createSupabaseServerClient();

  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? '').trim();
  const status = sp.status ?? 'all';

  let query = supabase
    .from('customers')
    .select('id,name,document,phone,email,active,created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,document.ilike.%${q}%,email.ilike.%${q}%`);
  }

  if (status === 'active') query = query.eq('active', true);
  if (status === 'inactive') query = query.eq('active', false);

  const { data: customers, error } = await query;

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Clientes"
        title="Clientes"
        subtitle="Gestão de clientes (atacado e relacionamento)."
        actions={
          <Link
            href="/admin/clientes/novo"
            className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-yellow-300"
          >
            + Novo Cliente
          </Link>
        }
      />

      <Panel>
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-200">Lista de clientes</div>
              <div className="mt-1 text-xs text-slate-400">{(customers ?? []).length} exibidos</div>
            </div>

            <form className="flex flex-col gap-2 sm:flex-row" action="/admin/clientes" method="get">
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por nome, WhatsApp, documento ou email…"
                className="w-full min-w-[260px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
              />
              <select
                name="status"
                defaultValue={status}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 sm:w-[180px]"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
              <button className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-white/15">
                Filtrar
              </button>
            </form>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
            <div className="font-semibold">Erro ao carregar clientes</div>
            <div className="mt-2 opacity-90">{error.message}</div>
          </div>
        ) : (customers ?? []).length === 0 ? (
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
                {(customers ?? []).map((c: any) => {
                  const wa = c.phone ? buildWhatsAppUrl(c.phone, `Olá ${c.name}!`) : null;
                  return (
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
                        <div className="flex flex-wrap items-center gap-3">
                          <Link
                            href={`/admin/clientes/${c.id}`}
                            className="font-semibold text-yellow-300 hover:text-yellow-200"
                          >
                            Abrir
                          </Link>
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-slate-300 hover:text-white"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
