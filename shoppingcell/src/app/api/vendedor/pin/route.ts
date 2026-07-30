import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function tryOp(fn: () => Promise<{ error: any }>) {
  try {
    const { error } = await fn();
    return error;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cleanEmail = String(body.email || '').trim().toLowerCase();
    const cleanName  = String(body.name  || '').trim();
    const cleanPin   = String(body.pin   || '').trim();
    const cleanRole  = String(body.role  || 'staff').trim();
    const existingId = body.id && IS_UUID.test(body.id) ? String(body.id) : '';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'O e-mail é obrigatório para o login do vendedor.' },
        { status: 400 },
      );
    }

    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 6 || !/^\d+$/.test(cleanPin)) {
      return NextResponse.json(
        { ok: false, error: 'A senha PIN deve ter entre 4 e 6 dígitos numéricos.' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    let savedId = existingId || crypto.randomUUID();

    // 1. Tenta salvar na tabela dedicada seller_access
    const { error: saErr } = await supabase
      .from('seller_access')
      .upsert(
        { name: cleanName, email: cleanEmail, pin_code: cleanPin, role: cleanRole, active: true },
        { onConflict: 'email' },
      );

    // 2. Sincroniza em hr_employees para garantir presenças e visualização no RH
    await tryOp(async () => {
      const { error } = await supabase
        .from('hr_employees')
        .upsert(
          { id: savedId, name: cleanName, role: cleanRole, status: 'active', pin_code: cleanPin } as any,
          { onConflict: 'id' },
        );
      return { error };
    });

    // 3. Sincroniza em staff_profiles para garantir acesso ao PDV
    await tryOp(async () => {
      const { error } = await supabase
        .from('staff_profiles')
        .upsert(
          { user_id: savedId, role: cleanRole, active: true, pin_code: cleanPin } as any,
          { onConflict: 'user_id' },
        );
      return { error };
    });

    // 4. Sincroniza em admin_users se a coluna existir
    await tryOp(async () => {
      const { error } = await supabase
        .from('admin_users')
        .upsert(
          { user_id: savedId, role: cleanRole, pin_code: cleanPin } as any,
          { onConflict: 'user_id' },
        );
      return { error };
    });

    return NextResponse.json({
      ok: true,
      message: 'Vendedor salvo com sucesso!',
      seller: { id: savedId, name: cleanName, email: cleanEmail, role: cleanRole, pin: cleanPin },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const cleanId    = String(body.id    || '').trim();
    const cleanEmail = String(body.email || '').trim().toLowerCase();

    if (!cleanId && !cleanEmail) {
      return NextResponse.json(
        { ok: false, error: 'ID ou E-mail do vendedor não informado.' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    if (cleanEmail) {
      await tryOp(async () => { const { error } = await supabase.from('seller_access').delete().ilike('email', cleanEmail); return { error }; });
      await tryOp(async () => { const { error } = await supabase.from('staff_profiles').delete().ilike('email', cleanEmail); return { error }; });
      await tryOp(async () => { const { error } = await supabase.from('hr_employees').delete().ilike('email', cleanEmail); return { error }; });
    }

    if (cleanId && IS_UUID.test(cleanId)) {
      await tryOp(async () => { const { error } = await supabase.from('seller_access').delete().eq('id', cleanId); return { error }; });
      await tryOp(async () => { const { error } = await supabase.from('staff_profiles').delete().eq('user_id', cleanId); return { error }; });
      await tryOp(async () => { const { error } = await supabase.from('hr_employees').delete().eq('id', cleanId); return { error }; });
    }

    return NextResponse.json({ ok: true, message: 'Vendedor excluído com sucesso!' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
