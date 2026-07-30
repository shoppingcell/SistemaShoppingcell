import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    const cleanPin = String(pin || '').trim();

    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 6) {
      return NextResponse.json(
        { ok: false, error: 'O PIN deve conter entre 4 e 6 dígitos numéricos.' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // 1. Check in staff_profiles
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('user_id,display_name,role,pin_code')
      .eq('pin_code', cleanPin)
      .maybeSingle();

    if (staff) {
      return NextResponse.json({
        ok: true,
        seller: {
          id: staff.user_id,
          name: staff.display_name,
          role: staff.role || 'staff',
        },
      });
    }

    // 2. Fallback check in hr_employees
    const { data: emp } = await supabase
      .from('hr_employees')
      .select('id,name,role,pin_code')
      .eq('pin_code', cleanPin)
      .maybeSingle();

    if (emp) {
      return NextResponse.json({
        ok: true,
        seller: {
          id: emp.id,
          name: emp.name,
          role: 'staff',
        },
      });
    }

    // 3. Fallback check in admin_users
    const { data: adm } = await supabase
      .from('admin_users')
      .select('user_id,role,pin_code')
      .eq('pin_code', cleanPin)
      .maybeSingle();

    if (adm) {
      return NextResponse.json({
        ok: true,
        seller: {
          id: adm.user_id,
          name: 'Administrador',
          role: adm.role || 'owner',
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: 'PIN de acesso incorreto ou vendedor não encontrado.' },
      { status: 401 },
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
