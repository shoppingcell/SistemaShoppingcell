import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { email, pin } = await req.json();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPin = String(pin || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'Por favor, informe um e-mail válido.' },
        { status: 400 },
      );
    }

    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 6) {
      return NextResponse.json(
        { ok: false, error: 'O PIN deve conter entre 4 e 6 dígitos numéricos.' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // 1. Check in admin_users by email & pin_code (primary source — always has email)
    const { data: adm } = await supabase
      .from('admin_users')
      .select('user_id,email,role,pin_code,display_name')
      .ilike('email', cleanEmail)
      .eq('pin_code', cleanPin)
      .maybeSingle();

    if (adm) {
      return NextResponse.json({
        ok: true,
        seller: {
          id: adm.user_id,
          name: (adm as any).display_name || cleanEmail.split('@')[0],
          email: (adm as any).email || cleanEmail,
          role: adm.role || 'staff',
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: 'E-mail ou PIN de acesso incorretos.' },
      { status: 401 },
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
