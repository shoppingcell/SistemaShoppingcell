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

    // Resolve a valid UUID for this seller
    let targetId: string = (id && IS_UUID.test(id)) ? id : '';

    if (!targetId && cleanEmail) {
      // Try to find existing record by email in admin_users (the table that has email column)
      const { data: existingAdm } = await supabase
        .from('admin_users')
        .select('user_id')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (existingAdm?.user_id && IS_UUID.test(existingAdm.user_id)) {
        targetId = existingAdm.user_id;
      }
    }

    if (!targetId) {
      targetId = crypto.randomUUID();
    }

    const errors: string[] = [];

    // A. Upsert in admin_users (has email, display_name, pin_code, role columns)
    const { error: admErr } = await supabase.from('admin_users').upsert(
      {
        user_id: targetId,
        email: cleanEmail,
        display_name: cleanName || cleanEmail,
        role: cleanRole,
        pin_code: cleanPin,
      } as any,
      { onConflict: 'user_id' },
    );
    if (admErr) errors.push(`admin_users: ${admErr.message}`);

    // B. Upsert in staff_profiles — only columns that exist in the table
    // Try with email/display_name first (requires patch SQL), fall back to basic columns
    const staffPayloadFull = {
      user_id: targetId,
      display_name: cleanName || cleanEmail,
      email: cleanEmail,
      role: cleanRole,
      pin_code: cleanPin,
      active: true,
    };

    const staffPayloadBasic = {
      user_id: targetId,
      role: cleanRole,
      pin_code: cleanPin,
      active: true,
    };

    const { error: staffErr } = await supabase
      .from('staff_profiles')
      .upsert(staffPayloadFull as any, { onConflict: 'user_id' });

    if (staffErr) {
      // If email/display_name columns don't exist yet, fall back to basic upsert
      if (staffErr.message.includes("column") && staffErr.message.includes("schema cache")) {
        const { error: staffErrBasic } = await supabase
          .from('staff_profiles')
          .upsert(staffPayloadBasic as any, { onConflict: 'user_id' });
        if (staffErrBasic) errors.push(`staff_profiles: ${staffErrBasic.message}`);
      } else {
        errors.push(`staff_profiles: ${staffErr.message}`);
      }
    }

    // C. Upsert in hr_employees — only columns that exist in the table
    const hrPayloadFull = {
      id: targetId,
      name: cleanName || cleanEmail,
      email: cleanEmail,
      role: cleanRole,
      pin_code: cleanPin,
      status: 'active',
    };

    const hrPayloadBasic = {
      id: targetId,
      name: cleanName || cleanEmail,
      role: cleanRole,
      pin_code: cleanPin,
      status: 'active',
    };

    const { error: hrErr } = await supabase
      .from('hr_employees')
      .upsert(hrPayloadFull as any, { onConflict: 'id' });

    if (hrErr) {
      // If email column doesn't exist yet, fall back to basic upsert
      if (hrErr.message.includes("column") && hrErr.message.includes("schema cache")) {
        const { error: hrErrBasic } = await supabase
          .from('hr_employees')
          .upsert(hrPayloadBasic as any, { onConflict: 'id' });
        if (hrErrBasic) errors.push(`hr_employees: ${hrErrBasic.message}`);
      } else {
        errors.push(`hr_employees: ${hrErr.message}`);
      }
    }

    // If admin_users failed, nothing was saved at all
    if (admErr) {
      return NextResponse.json(
        { ok: false, error: `Não foi possível salvar: ${errors.join('; ')}` },
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
      // admin_users always has email column
      await supabase.from('admin_users').delete().ilike('email', cleanEmail);
      // For other tables, try email column and gracefully ignore if not found
      await supabase.from('hr_employees').delete().ilike('email', cleanEmail).then(() => null, () => null);
      await supabase.from('staff_profiles').delete().ilike('email', cleanEmail).then(() => null, () => null);
    }

    return NextResponse.json({ ok: true, message: 'Vendedor excluído com sucesso!' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
