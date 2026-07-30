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

  const [{ data: staffProfiles }, { data: hrEmployees }, { data: adminUsers }] = await Promise.all([
    supabase.from('staff_profiles').select('user_id,display_name,email,role,pin_code'),
    supabase.from('hr_employees').select('id,name,email,role,pin_code'),
    supabase.from('admin_users').select('user_id,email,role,pin_code'),
  ]);

  const map = new Map<string, { id: string; name: string; email: string; role: string; pin_code?: string | null }>();

  // 1. Load from hr_employees
  for (const emp of (hrEmployees as any[]) ?? []) {
    if (!emp.email) continue;
    map.set(emp.email.toLowerCase(), {
      id: emp.id,
      name: emp.name || emp.email,
      email: emp.email,
      role: emp.role || 'staff',
      pin_code: emp.pin_code || null,
    });
  }

  // 2. Load from staff_profiles
  for (const st of (staffProfiles as any[]) ?? []) {
    if (!st.email) continue;
    const existing = map.get(st.email.toLowerCase());
    map.set(st.email.toLowerCase(), {
      id: st.user_id || existing?.id || 'st_' + Date.now(),
      name: st.display_name || existing?.name || st.email,
      email: st.email,
      role: st.role || existing?.role || 'staff',
      pin_code: st.pin_code || existing?.pin_code || null,
    });
  }

  // 3. Load from admin_users
  for (const adm of (adminUsers as any[]) ?? []) {
    if (!adm.email) continue;
    const existing = map.get(adm.email.toLowerCase());
    map.set(adm.email.toLowerCase(), {
      id: adm.user_id || existing?.id || 'adm_' + Date.now(),
      name: existing?.name || adm.email,
      email: adm.email,
      role: adm.role || 'owner',
      pin_code: adm.pin_code || existing?.pin_code || null,
    });
  }

  const sellers = Array.from(map.values());

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
          Somente o <span className="font-semibold text-yellow-400">Proprietário (Owner)</span> possui autorização para cadastrar, editar ou excluir vendedores.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gestão de Vendedores & Controle de Acessos"
        subtitle="Cadastre, edite e gerencie o e-mail e a senha PIN de acesso dos vendedores"
        backHref="/admin"
      />

      <AcessosClient sellers={sellers} />
    </div>
  );
}
