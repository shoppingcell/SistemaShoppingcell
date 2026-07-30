import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { RhClient } from '@/app/admin/rh/RhClient';

export const dynamic = 'force-dynamic';

type EmployeeItem = {
  id: string;
  name: string;
  role: string | null;
  salary: number | null;
  hired_at: string | null;
  status: string;
};

export default async function RhPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: hrEmp }, { data: sellerAcc }, { data: staffProf }, { data: rawAdmins }, { data: payments }, { data: attendance }] =
    await Promise.all([
      supabase.from('hr_employees').select('*').then((r) => r, () => ({ data: [] as any[] })),
      supabase.from('seller_access').select('*').then((r) => r, () => ({ data: [] as any[] })),
      supabase.from('staff_profiles').select('*').then((r) => r, () => ({ data: [] as any[] })),
      supabase.rpc('list_admin_users').then((r) => r, () => ({ data: [] as any[] })),
      supabase.from('hr_payments').select('id,employee_id,description,amount,paid_at').order('paid_at', { ascending: false }).limit(300).then((r) => r, () => ({ data: [] as any[] })),
      supabase.from('hr_attendance').select('id,employee_id,day,status,note').order('day', { ascending: false }).limit(1000).then((r) => r, () => ({ data: [] as any[] })),
    ]);

  const map = new Map<string, EmployeeItem>();

  // 1. hr_employees (fonte primária do RH)
  for (const emp of ((hrEmp as any[]) ?? [])) {
    if (!emp.id) continue;
    map.set(emp.id, {
      id: emp.id,
      name: emp.name || 'Funcionário',
      role: emp.role || null,
      salary: emp.salary != null ? Number(emp.salary) : null,
      hired_at: emp.hired_at || null,
      status: emp.status || 'active',
    });
  }

  // 2. seller_access (vendedores cadastrados)
  for (const s of ((sellerAcc as any[]) ?? [])) {
    if (!s.id) continue;
    const existing = map.get(s.id);
    map.set(s.id, {
      id: s.id,
      name: s.name || existing?.name || s.email || 'Vendedor',
      role: s.role || existing?.role || 'Vendedor',
      salary: existing?.salary ?? null,
      hired_at: existing?.hired_at ?? null,
      status: s.active === false ? 'inactive' : 'active',
    });
  }

  // 3. staff_profiles
  for (const st of ((staffProf as any[]) ?? [])) {
    if (!st.user_id) continue;
    const existing = map.get(st.user_id);
    if (!existing) {
      map.set(st.user_id, {
        id: st.user_id,
        name: st.display_name || st.email || 'Funcionário',
        role: st.role || 'staff',
        salary: null,
        hired_at: null,
        status: st.active === false ? 'inactive' : 'active',
      });
    }
  }

  // 4. list_admin_users
  for (const adm of ((rawAdmins as any[]) ?? [])) {
    if (!adm.user_id) continue;
    const existing = map.get(adm.user_id);
    if (!existing) {
      map.set(adm.user_id, {
        id: adm.user_id,
        name: adm.email ? adm.email.split('@')[0] : 'Administrador',
        role: adm.role || 'owner',
        salary: null,
        hired_at: null,
        status: 'active',
      });
    }
  }

  const allEmployees = Array.from(map.values());

  return (
    <RhClient
      employees={allEmployees}
      payments={((payments as any) ?? [])}
      attendance={((attendance as any) ?? [])}
    />
  );
}
