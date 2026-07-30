import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 6 || !/^\d+$/.test(cleanPin)) {
      return NextResponse.json(
        { ok: false, error: 'A senha PIN deve possuir entre 4 e 6 números.' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // 1. Try to find existing record by email or id across tables to maintain consistent user_id
    let targetId: string = (id && IS_UUID.test(id)) ? id : '';

    if (!targetId) {
      const { data: existingStaff } = await supabase
        .from('staff_profiles')
        .select('user_id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existingStaff?.user_id && IS_UUID.test(existingStaff.user_id)) {
        targetId = existingStaff.user_id;
      }
    }

    if (!targetId) {
      const { data: existingHr } = await supabase
        .from('hr_employees')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existingHr?.id && IS_UUID.test(existingHr.id)) {
        targetId = existingHr.id;
      }
    }

    if (!targetId) {
      const { data: existingAdm } = await supabase
        .from('admin_users')
        .select('user_id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existingAdm?.user_id && IS_UUID.test(existingAdm.user_id)) {
        targetId = existingAdm.user_id;
      }
    }

    // Fallback to a brand new valid UUID v4
    if (!targetId) {
      targetId = crypto.randomUUID();
    }

    const errors: string[] = [];

    // A. Upsert in hr_employees
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
    if (hrErr) errors.push(`hr_employees: ${hrErr.message}`);

    // B. Upsert in staff_profiles
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
    if (staffErr) errors.push(`staff_profiles: ${staffErr.message}`);

    // C. Upsert / Manage in admin_users
    if (cleanRole === 'owner' || cleanRole === 'manager') {
      const { error: admErr } = await supabase.from('admin_users').upsert(
        {
          user_id: targetId,
          email: cleanEmail,
          role: cleanRole,
          pin_code: cleanPin,
        } as any,
        { onConflict: 'user_id' },
      );
      if (admErr) errors.push(`admin_users: ${admErr.message}`);
    } else {
      // If demoted to staff, remove from admin_users table
      await supabase.from('admin_users').delete().eq('user_id', targetId);
    }

    if (errors.length > 0 && errors.every((e) => e.includes('admin_users') || e.includes('staff_profiles'))) {
      // If at least hr_employees succeeded, we consider it saved!
      console.warn('Partial warnings while saving seller access:', errors);
    } else if (errors.length > 0 && hrErr && staffErr) {
      return NextResponse.json(
        { ok: false, error: `Não foi possível salvar o cadastro: ${errors.join('; ')}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Cadastro de vendedor e PIN salvos com sucesso!',
      seller: { id: targetId, name: cleanName, email: cleanEmail, role: cleanRole, pin: cleanPin },
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

    if (cleanId && IS_UUID.test(cleanId)) {
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
