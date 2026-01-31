'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const nav: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: '▦' },
  { href: '/admin/produtos', label: 'Produtos', icon: '▣' },
  { href: '/admin/categorias', label: 'Categorias', icon: '⌁' },
  { href: '/admin/estoque', label: 'Estoque', icon: '≋' },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname.startsWith(href);
}

export default function AdminShellClient({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = useMemo(() => {
    return nav.map((i) => ({ ...i, active: isActive(pathname, i.href) }));
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur md:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-200"
        >
          Menu
        </button>
        <div className="text-sm font-semibold">Admin</div>
        <div className="w-[52px]" />
      </div>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside
          className={
            'fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-slate-950 md:static md:block ' +
            (open ? 'block' : 'hidden')
          }
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-4 py-4">
              <Link href="/admin" className="text-lg font-extrabold tracking-tight">
                ShoppingCell
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-800 bg-slate-900/40 px-2 py-1 text-xs text-slate-300 md:hidden"
              >
                Fechar
              </button>
            </div>

            <nav className="px-2">
              {items.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setOpen(false)}
                  className={
                    'mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm ' +
                    (i.active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-300 hover:bg-slate-900/60 hover:text-white')
                  }
                >
                  <span className="grid h-7 w-7 place-items-center rounded-md border border-slate-800 bg-slate-900/40 text-xs">
                    {i.icon}
                  </span>
                  <span className="font-semibold">{i.label}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-auto border-t border-slate-800 px-4 py-4">
              <div className="truncate text-xs text-slate-400">{userEmail}</div>
              <div className="mt-3 flex items-center gap-2">
                <Link href="/" className="text-xs text-slate-300 hover:text-white">
                  Ver site
                </Link>
                <span className="text-slate-700">•</span>
                <form action="/auth/logout" method="post">
                  <button className="text-xs text-slate-300 hover:text-white">Sair</button>
                </form>
              </div>
            </div>
          </div>
        </aside>

        {/* Backdrop on mobile */}
        {open && (
          <button
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Content */}
        <div className="w-full px-4 py-8 md:px-8">{children}</div>
      </div>
    </div>
  );
}
