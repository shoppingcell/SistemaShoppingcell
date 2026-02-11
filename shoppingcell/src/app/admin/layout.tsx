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

  // Check access
  const { data: au } = await supabase
    .from('admin_users')
    .select('user_id,role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!au) {
    redirect('/admin/not-authorized');
  }

  return <AdminShellClient userEmail={user.email}>{children}</AdminShellClient>;
}
