import { createSupabaseServerClient } from '@/lib/supabaseServer';
import AdminShellClient from './AdminShellClient';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AdminShellClient userEmail={user?.email}>{children}</AdminShellClient>;
}
