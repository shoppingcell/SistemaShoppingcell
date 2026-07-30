import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { userId, employeeName, role, pin } = await req.json();
    const cleanUserId = String(userId || '').trim();
    const cleanPin = String(pin || '').trim();

    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 6) {
      return NextResponse.json(
        { ok: false, error: 'O PIN deve ser composto por 4 a 6 números.' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // Upsert into staff_profiles
    if (cleanUserId) {
      const { error: staffErr } = await supabase.from('staff_profiles').upsert(
        {
          user_id: cleanUserId,
          display_name: employeeName || 'Vendedor',
          role: role || 'staff',
          pin_code: cleanPin,
        } as any,
        { onConflict: 'user_id' },
      );

      if (staffErr && !/relation .*staff_profiles.* does not exist/i.test(staffErr.message)) {
        console.warn('staff_profiles update notice:', staffErr.message);
      }

      // Also update admin_users if column exists
      await supabase
        .from('admin_users')
        .update({ pin_code: cleanPin } as any)
        .eq('user_id', cleanUserId);
    }

    return NextResponse.json({ ok: true, message: 'PIN atualizado com sucesso!' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
