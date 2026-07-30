import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { AcessosClient } from './AcessosClient';

export const dynamic = 'force-dynamic';

export default async function AcessosPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: isOwner } = await supabase.rpc('is_admin_owner');

  if (!user) return null;

  if (!isOwner) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <PageHeader
          title="Controle de Acessos"
          subtitle="Gerencie as permissões dos vendedores e administradores"
          backHref="/admin"
        />
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200">
          Somente o <span className="font-semibold text-yellow-400">Proprietário (Owner)</span> pode
          cadastrar, editar ou excluir vendedores.
        </div>
      </div>
    );
  }

  // Carrega da tabela dedicada seller_access
  const { data: sellerRows, error: sellerErr } = await supabase
    .from('seller_access')
    .select('id, name, email, role, pin_code, active')
    .order('created_at', { ascending: false });

  // Detecta se a tabela ainda não foi criada
  const tableNotFound =
    sellerErr &&
    (sellerErr.message.includes('does not exist') || sellerErr.message.includes('schema cache'));

  type SellerUser = {
    id: string;
    name: string;
    email: string;
    role: string;
    pin_code?: string | null;
  };

  const sellers: SellerUser[] = ((sellerRows as any[]) ?? []).map((s) => ({
    id: s.id,
    name: s.name || s.email,
    email: s.email,
    role: s.role || 'staff',
    pin_code: s.pin_code || null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gestão de Vendedores & Controle de Acessos"
        subtitle="Cadastre, edite e gerencie o e-mail e a senha PIN de acesso dos vendedores"
        backHref="/admin"
      />

      {tableNotFound && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <div className="font-bold">⚠️ Configuração necessária</div>
          <div className="mt-1 text-xs">
            Execute o arquivo{' '}
            <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-yellow-300">
              supabase/admin_patch_seller_access.sql
            </code>{' '}
            no <strong>SQL Editor do Supabase</strong> para habilitar o gerenciamento de vendedores.
          </div>
        </div>
      )}

      <AcessosClient sellers={sellers} tableReady={!tableNotFound} />
    </div>
  );
}
