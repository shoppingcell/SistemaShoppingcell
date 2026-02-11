import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import AdminShellClient from './AdminShellClient';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  // Bootstrap: if admin_users is empty, the first logged user becomes owner.
  const { count } = await supabase.from('admin_users').select('user_id', { head: true, count: 'exact' });

  if ((count || 0) === 0) {
    await supabase.from('admin_users').insert({ user_id: user.id, role: 'owner' } as any);
  }

  // admin_users (owner/manager/staff) => full admin
  const { data: au } = await supabase
    .from('admin_users')
    .select('user_id,role')
    .eq('user_id', user.id)
    .maybeSingle();

  // staff_profiles (seller/admin) => can access /admin (PDV), with limited UI
  const { data: sp } = await supabase
    .from('staff_profiles')
    .select('user_id,role,active')
    .eq('user_id', user.id)
    .maybeSingle();

  // Auto-create staff profile for admin users (one-time bootstrap)
  if (au && !sp) {
    await supabase.from('staff_profiles').insert({ user_id: user.id, role: 'admin', active: true } as any);
  }

  const { data: sp2 } = await supabase
    .from('staff_profiles')
    .select('user_id,role,active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!au && !(sp2 && (sp2 as any).active)) {
    redirect('/admin/not-authorized');
  }

  const effectiveRole = (au ? 'admin' : ((sp2 as any)?.role ?? 'seller')) as 'admin' | 'seller';

  return (
    <AdminShellClient userEmail={user.email} role={effectiveRole}>
      {children}
    </AdminShellClient>
  );
}
