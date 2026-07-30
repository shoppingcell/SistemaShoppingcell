import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { id, name, email, role, pin } = await req.json();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(name || '').trim();
    const cleanPin = String(pin || '').trim();
    const cleanRole = String(role || 'staff').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'O e-mail é obrigatório para o login do vendedor.' },
        { status: 400 },
      );
    }

    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 6) {
      return NextResponse.json(
        { ok: false, error: 'A senha PIN deve possuir entre 4 e 6 números.' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const targetId = id || 'emp_' + Date.now();

    // 1. Upsert in hr_employees
    const { error: hrErr } = await supabase.from('hr_employees').upsert(
      {
        id: targetId,
        name: cleanName || cleanEmail,
        email: cleanEmail,
        role: cleanRole,
        pin_code: cleanPin,
        status: 'active',
      } as any,
      { onConflict: 'id' },
    );

    // 2. Upsert in staff_profiles
    const { error: staffErr } = await supabase.from('staff_profiles').upsert(
      {
        user_id: targetId,
        display_name: cleanName || cleanEmail,
        email: cleanEmail,
        role: cleanRole,
        pin_code: cleanPin,
      } as any,
      { onConflict: 'user_id' },
    );

    // 3. Upsert in admin_users if role is owner or manager
    if (cleanRole === 'owner' || cleanRole === 'manager') {
      await supabase.from('admin_users').upsert(
        {
          user_id: targetId,
          email: cleanEmail,
          role: cleanRole,
          pin_code: cleanPin,
        } as any,
        { onConflict: 'user_id' },
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Cadastro de vendedor e PIN salvos com sucesso!',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id, email } = await req.json();
    const cleanId = String(id || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanId && !cleanEmail) {
      return NextResponse.json(
        { ok: false, error: 'ID ou E-mail do vendedor não informado.' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    if (cleanId) {
      await supabase.from('hr_employees').delete().eq('id', cleanId);
      await supabase.from('staff_profiles').delete().eq('user_id', cleanId);
      await supabase.from('admin_users').delete().eq('user_id', cleanId);
    }

    if (cleanEmail) {
      await supabase.from('hr_employees').delete().ilike('email', cleanEmail);
      await supabase.from('staff_profiles').delete().ilike('email', cleanEmail);
      await supabase.from('admin_users').delete().ilike('email', cleanEmail);
    }

    return NextResponse.json({ ok: true, message: 'Vendedor excluído com sucesso!' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
