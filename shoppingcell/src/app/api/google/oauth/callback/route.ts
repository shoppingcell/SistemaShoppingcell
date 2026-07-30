import { NextResponse } from 'next/server';
import { getGoogleOAuthClient } from '@/lib/googleAuth';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = requestUrl.origin;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/admin/integracoes/google?status=error&msg=${encodeURIComponent(error)}`, origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/admin/integracoes/google?status=error&msg=missing_code', origin));
  }

  const oauth2 = getGoogleOAuthClient();
  const { tokens } = await oauth2.getToken(code);

  // IMPORTANT: we can't securely write env vars from inside the container in all setups.
  // We show the refresh_token once so the user can paste it into the server .env.
  const refresh = tokens.refresh_token;

  const url = new URL('/admin/integracoes/google', origin);
  if (refresh) {
    url.searchParams.set('status', 'ok');
    url.searchParams.set('refresh_token', refresh);
  } else {
    url.searchParams.set('status', 'warn');
    url.searchParams.set('msg', 'no_refresh_token_returned');
  }

  return NextResponse.redirect(url);
}
