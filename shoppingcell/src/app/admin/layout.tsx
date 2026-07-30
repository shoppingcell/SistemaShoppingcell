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

  const cleanEmail = (user.email || '').toLowerCase();
  const displayName = cleanEmail ? cleanEmail.split('@')[0] : 'Administrador';
  const isAdminEmail =
    cleanEmail.includes('@adm') ||
    cleanEmail.includes('admin') ||
    cleanEmail.includes('maydson') ||
    cleanEmail.endsWith('@shoppingcell.tech');

  // Check admin_users (owner/manager/staff)
  const { data: au } = await supabase
    .from('admin_users')
    .select('user_id,role')
    .eq('user_id', user.id)
    .maybeSingle();

  // Check staff_profiles
  const { data: sp } = await supabase
    .from('staff_profiles')
    .select('user_id,role,active')
    .eq('user_id', user.id)
    .maybeSingle();

  // Auto-bootstrap e promoção de permissões para maydsonptk@adm.com e emails administrativos
  if (!au || (isAdminEmail && au.role !== 'owner')) {
    await supabase
      .from('admin_users')
      .upsert(
        {
          user_id: user.id,
          email: cleanEmail,
          display_name: displayName,
          role: 'owner',
        } as any,
        { onConflict: 'user_id' },
      )
      .then(() => null, () => null);
  }

  if (!sp || (isAdminEmail && sp.role !== 'admin')) {
    await supabase
      .from('staff_profiles')
      .upsert(
        {
          user_id: user.id,
          display_name: displayName,
          email: cleanEmail,
          role: 'admin',
          active: true,
        } as any,
        { onConflict: 'user_id' },
      )
      .then(() => null, () => null);
  }

  // Re-fetch para determinar a role efetiva
  const { data: auFinal } = await supabase
    .from('admin_users')
    .select('user_id,role')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: spFinal } = await supabase
    .from('staff_profiles')
    .select('user_id,role,active')
    .eq('user_id', user.id)
    .maybeSingle();

  const effectiveRole = (auFinal || isAdminEmail || (spFinal && (spFinal as any).role === 'admin')
    ? 'admin'
    : ((spFinal as any)?.role ?? 'seller')) as 'admin' | 'seller';

  return (
    <AdminShellClient userEmail={user.email} role={effectiveRole}>
      {children}
    </AdminShellClient>
  );
}
