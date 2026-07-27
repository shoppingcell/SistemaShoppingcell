'use client';

import { createBrowserClient } from '@supabase/ssr';

function parseCookie(cookie: string) {
  const out: Record<string, string> = {};
  cookie.split(';').forEach((part) => {
    const [k, ...rest] = part.trim().split('=');
    if (!k) return;
    out[decodeURIComponent(k)] = decodeURIComponent(rest.join('=') || '');
  });
  return out;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabaseBrowser = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    cookies: {
      getAll() {
        if (typeof document === 'undefined') return [];
        const map = parseCookie(document.cookie || '');
        return Object.entries(map).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        if (typeof document === 'undefined') return;
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
          if (options?.path) cookie += `; Path=${options.path}`;
          if (options?.maxAge) cookie += `; Max-Age=${options.maxAge}`;
          if (options?.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
          if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`;
          if (options?.secure) cookie += `; Secure`;
          document.cookie = cookie;
        });
      },
    },
  },
);
