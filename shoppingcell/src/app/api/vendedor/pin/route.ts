import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tenta uma operação e retorna o erro sem lançar exceção */
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

    // ── 1. TABELA PRINCIPAL: seller_access ────────────────────────────────────
    // Esta é a tabela DEFINITIVA para gestão de vendedores.
    // Tem todas as colunas certas e é criada pelo patch SQL.

    let savedOk = false;
    let savedId = existingId;

    if (existingId) {
      // Atualizar por ID
      const { error: updErr } = await supabase
        .from('seller_access')
        .update({ name: cleanName, email: cleanEmail, pin_code: cleanPin, role: cleanRole, active: true })
        .eq('id', existingId);

      if (!updErr) {
        savedOk = true;
      } else if (updErr.message.includes('does not exist') || updErr.message.includes('schema cache')) {
        // Tabela ainda não existe — instruir o usuário
        return NextResponse.json(
          {
            ok: false,
            error:
              'Configure o banco de dados: execute o arquivo supabase/admin_patch_seller_access.sql no SQL Editor do Supabase e tente novamente.',
          },
          { status: 500 },
        );
      }
    }

    if (!savedOk) {
      // Inserir ou atualizar por email (upsert)
      const { data: upserted, error: upsErr } = await supabase
        .from('seller_access')
        .upsert(
          { name: cleanName, email: cleanEmail, pin_code: cleanPin, role: cleanRole, active: true },
          { onConflict: 'email' },
        )
        .select('id')
        .maybeSingle();

      if (upsErr) {
        if (upsErr.message.includes('does not exist') || upsErr.message.includes('schema cache')) {
          return NextResponse.json(
            {
              ok: false,
              error:
                '⚠️ Banco de dados não configurado.\n\nExecute o arquivo supabase/admin_patch_seller_access.sql no SQL Editor do Supabase e tente novamente.',
            },
            { status: 500 },
          );
        }
        return NextResponse.json(
          { ok: false, error: `Erro ao salvar vendedor: ${upsErr.message}` },
          { status: 500 },
        );
      }

      savedOk = true;
      savedId = upserted?.id || existingId;
    }

    // ── 2. SYNC OPCIONAL: staff_profiles ──────────────────────────────────────
    // Sincroniza com staff_profiles para habilitar o acesso ao admin.
    // Usa apenas colunas que têm CERTEZA de existir: user_id, role, active
    // Se savedId não é um UUID do auth.users, isso pode ser ignorado
    if (savedId && IS_UUID.test(savedId)) {
      await tryOp(async () => {
        const { error } = await supabase
          .from('staff_profiles')
          .upsert({ user_id: savedId, role: cleanRole, active: true } as any, {
            onConflict: 'user_id',
          });
        return { error };
      });
    }

    return NextResponse.json({
      ok: true,
      message: 'Vendedor salvo com sucesso!',
      seller: { id: savedId, name: cleanName, email: cleanEmail, role: cleanRole },
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
    }

    if (cleanId && IS_UUID.test(cleanId)) {
      await tryOp(async () => { const { error } = await supabase.from('seller_access').delete().eq('id', cleanId); return { error }; });
      await tryOp(async () => { const { error } = await supabase.from('staff_profiles').delete().eq('user_id', cleanId); return { error }; });
    }

    return NextResponse.json({ ok: true, message: 'Vendedor excluído com sucesso!' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
