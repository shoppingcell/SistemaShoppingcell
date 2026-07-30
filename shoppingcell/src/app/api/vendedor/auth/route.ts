import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { email, pin } = await req.json();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPin   = String(pin   || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'Por favor, informe um e-mail válido.' },
        { status: 400 },
      );
    }

    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 6) {
      return NextResponse.json(
        { ok: false, error: 'O PIN deve ter entre 4 e 6 dígitos.' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // 1. Tenta buscar em seller_access
    const { data: seller } = await supabase
      .from('seller_access')
      .select('id, name, email, role, active')
      .ilike('email', cleanEmail)
      .eq('pin_code', cleanPin)
      .maybeSingle()
      .then((r) => r, () => ({ data: null }));

    if (seller) {
      if (!seller.active) {
        return NextResponse.json(
          { ok: false, error: 'Este acesso está desativado. Contate o administrador.' },
          { status: 403 },
        );
      }
      return NextResponse.json({
        ok: true,
        seller: { id: seller.id, name: seller.name, email: seller.email, role: seller.role },
      });
    }

    // 2. Fallback: busca em admin_users
    const { data: adm } = await supabase
      .from('admin_users')
      .select('user_id, email, role, pin_code, display_name')
      .ilike('email', cleanEmail)
      .eq('pin_code', cleanPin)
      .maybeSingle()
      .then((r) => r, () => ({ data: null }));

    if (adm) {
      return NextResponse.json({
        ok: true,
        seller: {
          id: adm.user_id,
          name: (adm as any).display_name || cleanEmail.split('@')[0],
          email: adm.email || cleanEmail,
          role: adm.role || 'staff',
        },
      });
    }

    // 3. Fallback: busca em hr_employees
    const { data: hr } = await supabase
      .from('hr_employees')
      .select('id, name, role, pin_code, email, status')
      .eq('pin_code', cleanPin)
      .maybeSingle()
      .then((r) => r, () => ({ data: null }));

    if (hr) {
      return NextResponse.json({
        ok: true,
        seller: {
          id: hr.id,
          name: hr.name,
          email: (hr as any).email || cleanEmail,
          role: hr.role || 'staff',
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: 'E-mail ou PIN incorretos.' },
      { status: 401 },
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
