import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { PageHeader } from '@/app/admin/_components/ui/PageHeader';
import { AcessosClient } from './AcessosClient';

export const dynamic = 'force-dynamic';

type SellerUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  pin_code?: string | null;
};

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

  // Carrega dados de TODAS as fontes para garantir que NENHUM cadastro fique oculto
  const [{ data: sellerAccess }, { data: rawAdmins }, { data: staffProfiles }, { data: hrEmployees }] =
    await Promise.all([
      supabase.from('seller_access').select('*').then((r) => r, () => ({ data: [] as any[] })),
      supabase.rpc('list_admin_users').then((r) => r, () => ({ data: [] as any[] })),
      supabase.from('staff_profiles').select('*').then((r) => r, () => ({ data: [] as any[] })),
      supabase.from('hr_employees').select('*').then((r) => r, () => ({ data: [] as any[] })),
    ]);

  const map = new Map<string, SellerUser>();

  // 1. Processa seller_access (tabela nova)
  for (const s of (sellerAccess as any[]) ?? []) {
    const key = s.id || s.email || 'sa_' + Math.random();
    map.set(key, {
      id: s.id || key,
      name: s.name || s.email || 'Vendedor',
      email: s.email || '',
      role: s.role || 'staff',
      pin_code: s.pin_code || null,
    });
  }

  // 2. Processa list_admin_users RPC (Usuários Admin do Auth Supabase)
  for (const adm of (rawAdmins as any[]) ?? []) {
    const emailLower = (adm.email || '').toLowerCase();
    const existingKey = Array.from(map.keys()).find(
      (k) => map.get(k)?.email.toLowerCase() === emailLower,
    );
    const key = existingKey || adm.user_id || adm.email || 'adm_' + Math.random();
    const existing = map.get(key);

    map.set(key, {
      id: adm.user_id || existing?.id || key,
      name: existing?.name || (adm.email ? adm.email.split('@')[0] : 'Administrador'),
      email: adm.email || existing?.email || '',
      role: adm.role || existing?.role || 'owner',
      pin_code: adm.pin_code || existing?.pin_code || null,
    });
  }

  // 3. Processa hr_employees (Funcionários cadastrados no RH, ex: Maria)
  for (const emp of (hrEmployees as any[]) ?? []) {
    const emailLower = (emp.email || '').toLowerCase();
    const existingKey = Array.from(map.keys()).find(
      (k) => emailLower && map.get(k)?.email.toLowerCase() === emailLower,
    );
    const key = existingKey || emp.id || 'emp_' + Math.random();
    const existing = map.get(key);

    map.set(key, {
      id: emp.id || existing?.id || key,
      name: emp.name || existing?.name || 'Funcionário',
      email: emp.email || existing?.email || '',
      role: emp.role || existing?.role || 'vendedor',
      pin_code: emp.pin_code || existing?.pin_code || null,
    });
  }

  // 4. Processa staff_profiles
  for (const st of (staffProfiles as any[]) ?? []) {
    const emailLower = (st.email || '').toLowerCase();
    const existingKey = Array.from(map.keys()).find(
      (k) => emailLower && map.get(k)?.email.toLowerCase() === emailLower,
    );
    const key = existingKey || st.user_id || 'st_' + Math.random();
    const existing = map.get(key);

    map.set(key, {
      id: st.user_id || existing?.id || key,
      name: st.display_name || existing?.name || 'Vendedor',
      email: st.email || existing?.email || '',
      role: st.role || existing?.role || 'staff',
      pin_code: st.pin_code || existing?.pin_code || null,
    });
  }

  const sellers = Array.from(map.values());

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gestão de Vendedores & Controle de Acessos"
        subtitle="Cadastre, edite e gerencie o e-mail e a senha PIN de acesso dos vendedores"
        backHref="/admin"
      />

      <AcessosClient sellers={sellers} tableReady={true} />
    </div>
  );
}
