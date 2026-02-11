import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
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
          // Important: in Next middleware, request.cookies is read-only.
          // We only set cookies on the response.
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  if (isAdminRoute && !user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && user) {
    // RBAC: only users present in public.admin_users can access /admin
    const { data: au, error: auErr } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    // If admin_users is empty, allow bootstrap (first user will be created as owner in /admin layout)
    const { count: adminCount } = await supabase
      .from('admin_users')
      .select('user_id', { head: true, count: 'exact' });

    if (!auErr && adminCount === 0) {
      return response;
    }

    if (auErr || !au) {
      const url = new URL('/admin/not-authorized', request.url);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Run on all routes to keep Supabase session cookies fresh (prevents intermittent logouts).
  // Ignore Next static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
