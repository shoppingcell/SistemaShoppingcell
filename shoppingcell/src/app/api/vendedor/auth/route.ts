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

    // 1. Check in staff_profiles by email & pin_code
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('user_id,display_name,email,role,pin_code')
      .ilike('email', cleanEmail)
      .eq('pin_code', cleanPin)
      .maybeSingle();

    if (staff) {
      return NextResponse.json({
        ok: true,
        seller: {
          id: staff.user_id,
          name: staff.display_name || cleanEmail,
          email: staff.email || cleanEmail,
          role: staff.role || 'staff',
        },
      });
    }

    // 2. Check in hr_employees by email & pin_code
    const { data: emp } = await supabase
      .from('hr_employees')
      .select('id,name,email,role,pin_code')
      .ilike('email', cleanEmail)
      .eq('pin_code', cleanPin)
      .maybeSingle();

    if (emp) {
      return NextResponse.json({
        ok: true,
        seller: {
          id: emp.id,
          name: emp.name,
          email: emp.email || cleanEmail,
          role: 'staff',
        },
      });
    }

    // 3. Check in admin_users by email & pin_code
    const { data: adm } = await supabase
      .from('admin_users')
      .select('user_id,email,role,pin_code')
      .ilike('email', cleanEmail)
      .eq('pin_code', cleanPin)
      .maybeSingle();

    if (adm) {
      return NextResponse.json({
        ok: true,
        seller: {
          id: adm.user_id,
          name: adm.email || 'Administrador',
          email: adm.email,
          role: adm.role || 'owner',
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
