import { createSupabaseServerClient } from '@/lib/supabaseServer';

export type AdminOrStaffUser = {
  id: string;
  isAdmin: boolean;
  isStaff: boolean;
  staffRole?: string | null;
};

export async function requireAdminOrActiveStaff() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401 as const, error: 'unauthorized' };
  }

  const [{ data: au, error: auErr }, { data: sp, error: spErr }] = await Promise.all([
    supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('staff_profiles').select('user_id,role,active').eq('user_id', user.id).maybeSingle(),
  ]);

  if (auErr || spErr) {
    return {
      ok: false as const,
      status: 500 as const,
      error: auErr?.message || spErr?.message || 'auth_check_failed',
    };
  }

  const isAdmin = Boolean(au);
  const isStaff = Boolean(sp && (sp as any).active);

  if (!isAdmin && !isStaff) {
    return { ok: false as const, status: 403 as const, error: 'forbidden' };
  }

  const out: AdminOrStaffUser = {
    id: user.id,
    isAdmin,
    isStaff,
    staffRole: (sp as any)?.role ?? null,
  };

  return { ok: true as const, user: out };
}
