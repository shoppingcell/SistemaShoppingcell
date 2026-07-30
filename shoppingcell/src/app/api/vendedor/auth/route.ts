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

    // Busca na tabela dedicada seller_access
    const { data: seller, error } = await supabase
      .from('seller_access')
      .select('id, name, email, role, active')
      .ilike('email', cleanEmail)
      .eq('pin_code', cleanPin)
      .maybeSingle();

    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'Banco de dados não configurado. Execute o arquivo supabase/admin_patch_seller_access.sql no SQL Editor do Supabase.',
          },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!seller) {
      return NextResponse.json(
        { ok: false, error: 'E-mail ou PIN incorretos.' },
        { status: 401 },
      );
    }

    if (!seller.active) {
      return NextResponse.json(
        { ok: false, error: 'Este acesso está desativado. Contate o administrador.' },
        { status: 403 },
      );
    }

    return NextResponse.json({
      ok: true,
      seller: {
        id:    seller.id,
        name:  seller.name,
        email: seller.email,
        role:  seller.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
