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
  { href: '/admin/pedidos', label: 'Pedidos', icon: '☰' },
  { href: '/admin/financeiro', label: 'Financeiro', icon: '$' },
  { href: '/admin/clientes', label: 'Clientes', icon: '👥' },
  { href: '/admin/rh', label: 'RH', icon: '⌂' },
  { href: '/admin/integracoes/google', label: 'Google Sheets', icon: '⧉' },
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur md:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-extrabold text-slate-100"
        >
          Menu
        </button>
        <div className="text-sm font-extrabold tracking-tight text-slate-100">ShoppingCell</div>
        <div className="w-[52px]" />
      </div>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside
          className={
            'fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-900/40 bg-slate-950 text-white md:static md:block ' +
            (open ? 'block' : 'hidden')
          }
        >
          <div className="flex h-full flex-col">
            <div className="px-5 py-5">
              <div className="flex items-center justify-between">
                <Link href="/admin" className="text-lg font-extrabold tracking-tight">
                  <span className="text-white">SHOPPING</span>
                  <span className="text-yellow-400">CELL</span>
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-1 text-xs text-slate-200 md:hidden"
                >
                  Fechar
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-400">Painel administrativo</div>
            </div>

            <nav className="px-3">
              {items.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setOpen(false)}
                  className={
                    'mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ' +
                    (i.active
                      ? 'bg-yellow-400 text-slate-950 shadow-sm'
                      : 'text-slate-200 hover:bg-slate-900/60 hover:text-white')
                  }
                >
                  <span
                    className={
                      'grid h-8 w-8 place-items-center rounded-lg text-xs ' +
                      (i.active ? 'bg-black/10 text-slate-950' : 'border border-slate-800 bg-slate-900/40')
                    }
                  >
                    {i.icon}
                  </span>
                  <span className="font-semibold">{i.label}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-auto border-t border-slate-800 px-5 py-4">
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
        <div className="w-full px-4 py-6 md:px-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
