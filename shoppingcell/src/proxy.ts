import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const p = request.nextUrl.pathname;
  const isAdminRoute = p.startsWith('/admin');
  const isAdminApiRoute = p.startsWith('/api/admin');

  if ((isAdminRoute || isAdminApiRoute) && !user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if ((isAdminRoute || isAdminApiRoute) && user) {
    const [{ data: au }, { data: sp }] = await Promise.all([
      supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle().then((r) => r, () => ({ data: null })),
      supabase.from('staff_profiles').select('user_id,role,active').eq('user_id', user.id).maybeSingle().then((r) => r, () => ({ data: null })),
    ]);

    // Se o perfil existe e está explicitamente desativado, bloqueia
    if (sp && sp.active === false) {
      const url = new URL('/admin/not-authorized', request.url);
      return NextResponse.redirect(url);
    }

    // Se é um vendedor com perfil de staff restrito, limita as rotas do admin
    const isSeller = !au && Boolean(sp?.active && sp.role === 'seller');
    if (isSeller) {
      const allowedPrefixes = [
        '/admin/pdv',
        '/admin/clientes',
        '/admin/estoque',
        '/admin/fiado',
        '/admin/not-authorized',
      ];
      const ok = allowedPrefixes.some((pref) => p === pref || p.startsWith(pref + '/'));
      if (!ok) {
        const url = new URL('/admin/pdv', request.url);
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
