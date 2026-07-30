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

  const [{ data: rawAdmins }, { data: staffProfiles }, { data: employees }] = await Promise.all([
    supabase.rpc('list_admin_users'),
    supabase.from('staff_profiles').select('user_id,display_name,role,pin_code'),
    supabase.from('hr_employees').select('id,name,role').order('name', { ascending: true }),
  ]);

  const staffByUserId = new Map((staffProfiles ?? []).map((s: any) => [s.user_id, s]));

  const admins = ((rawAdmins as any[]) ?? []).map((a: any) => {
    const s = staffByUserId.get(a.user_id);
    return {
      user_id: a.user_id,
      email: a.email,
      role: a.role,
      display_name: s?.display_name || a.email,
      pin_code: s?.pin_code || (a as any).pin_code || null,
    };
  });

  if (!user) {
    return null;
  }

  if (!isOwner) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <PageHeader
          title="Controle de Acessos"
          subtitle="Gerencie as permissões dos vendedores e administradores"
          backHref="/admin"
        />
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200">
          Somente o <span className="font-semibold text-yellow-400">Proprietário (Owner)</span> possui autorização para alterar senhas e níveis de acesso.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Controle de Acessos & Senhas de Vendedores"
        subtitle="Gerencie senhas PIN de 4 a 6 dígitos para o Portal do Vendedor Mobile"
        backHref="/admin"
      />

      <AcessosClient admins={admins} employees={(employees as any) ?? []} />
    </div>
  );
}
