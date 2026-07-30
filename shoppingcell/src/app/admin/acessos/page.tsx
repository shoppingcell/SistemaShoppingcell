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

  const [{ data: rawAdmins }, { data: staffProfiles }, { data: hrEmployees }] = await Promise.all([
    supabase.rpc('list_admin_users').then((r) => r, () => ({ data: [] as any[] })),
    supabase.from('staff_profiles').select('*').then((r) => r, () => ({ data: [] as any[] })),
    supabase.from('hr_employees').select('*').then((r) => r, () => ({ data: [] as any[] })),
  ]);

  const map = new Map<string, { id: string; name: string; email: string; role: string; pin_code?: string | null }>();

  // 1. Process list_admin_users RPC (Primary source for Auth Admins like maydsonptk@gmail.com)
  for (const adm of ((rawAdmins as any[]) ?? [])) {
    const key = adm.user_id || adm.email || 'adm_' + Math.random();
    map.set(key, {
      id: adm.user_id || key,
      name: adm.email ? adm.email.split('@')[0] : 'Administrador',
      email: adm.email || '',
      role: adm.role || 'owner',
      pin_code: adm.pin_code || null,
    });
  }

  // 2. Process staff_profiles
  for (const st of ((staffProfiles as any[]) ?? [])) {
    const key = st.user_id || st.email || 'st_' + Math.random();
    const existing =
      map.get(key) ||
      (st.email ? Array.from(map.values()).find((x) => x.email.toLowerCase() === st.email.toLowerCase()) : null);

    const merged = {
      id: st.user_id || existing?.id || key,
      name: st.display_name || existing?.name || st.email || 'Vendedor',
      email: st.email || existing?.email || '',
      role: st.role || existing?.role || 'staff',
      pin_code: st.pin_code || existing?.pin_code || null,
    };

    map.set(merged.id, merged);
  }

  // 3. Process hr_employees
  for (const emp of ((hrEmployees as any[]) ?? [])) {
    const key = emp.id || emp.email || 'emp_' + Math.random();
    const existing =
      map.get(key) ||
      (emp.email ? Array.from(map.values()).find((x) => x.email.toLowerCase() === emp.email.toLowerCase()) : null);

    const merged = {
      id: emp.id || existing?.id || key,
      name: emp.name || existing?.name || emp.email || 'Funcionário',
      email: emp.email || existing?.email || '',
      role: emp.role || existing?.role || 'staff',
      pin_code: emp.pin_code || existing?.pin_code || null,
    };

    map.set(merged.id, merged);
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
