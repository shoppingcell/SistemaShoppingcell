'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, Boxes, ChevronRight, CircleDollarSign, Contact, FileSpreadsheet,
  Globe, LayoutGrid, LockKeyhole, LogOut, Menu, Package, PanelLeftClose, PanelLeftOpen,
  ReceiptText, ScanLine, ShoppingCart, Tags, Users, X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ComponentType } from 'react';

type Role = 'admin' | 'seller';
type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number; className?: string }> };

const navAdmin: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/pdv', label: 'PDV', icon: ScanLine },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { href: '/admin/produtos', label: 'Produtos', icon: Package },
  { href: '/admin/categorias', label: 'Categorias', icon: Tags },
  { href: '/admin/estoque', label: 'Estoque', icon: Boxes },
  { href: '/admin/financeiro', label: 'Financeiro', icon: CircleDollarSign },
  { href: '/admin/clientes', label: 'Clientes', icon: Contact },
  { href: '/admin/fiado', label: 'Fiado', icon: ReceiptText },
  { href: '/admin/rh', label: 'Equipe / RH', icon: Users },
  { href: '/admin/acessos', label: 'Acessos', icon: LockKeyhole },
  { href: '/admin/integracoes/google', label: 'Google Sheets', icon: FileSpreadsheet },
];

const navSeller: NavItem[] = [
  { href: '/admin/pdv', label: 'PDV', icon: ScanLine },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { href: '/admin/fiado', label: 'Fiado', icon: ReceiptText },
  { href: '/admin/clientes', label: 'Clientes', icon: Contact },
  { href: '/admin/estoque', label: 'Estoque', icon: Boxes },
];

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === href : pathname.startsWith(href);
}

export default function AdminShellClient({
  children,
  userEmail,
  role = 'admin',
}: {
  children: React.ReactNode;
  userEmail?: string | null;
  role?: Role;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Restore collapsed preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    if (saved === 'true') {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const items = role === 'seller' ? navSeller : navAdmin;
  const activeItem = useMemo(() => items.find((item) => isActive(pathname, item.href)), [items, pathname]);
  const pageTitle = activeItem?.label ?? 'Painel';

  return (
    <div className="min-h-screen bg-[#07090d] text-slate-100">
      {/* Topbar Mobile */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#07090d]/90 px-4 backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"
          aria-label="Abrir menu"
        >
          <Menu size={19} />
        </button>
        <div className="text-sm font-extrabold">
          SHOPPING <span className="text-amber-400">CELL</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="mx-auto flex max-w-[1800px]">
        {/* Backdrop Mobile */}
        {open && (
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-white/[0.07] bg-[#0a0d12] transition-all duration-300 md:sticky md:top-0 md:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          } ${collapsed ? 'md:w-[76px]' : 'w-[278px]'}`}
        >
          {/* Header Sidebar */}
          <div className="flex h-20 items-center justify-between border-b border-white/[0.07] px-4">
            <Link
              href="/admin"
              className="flex items-center gap-3 overflow-hidden"
              onClick={() => setOpen(false)}
              title="Shopping Cell Admin"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400 text-black">
                <LayoutGrid size={19} />
              </span>
              {!collapsed && (
                <span className="truncate text-sm font-extrabold tracking-tight">
                  SHOPPING <span className="text-amber-400">CELL</span>
                </span>
              )}
            </Link>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white md:hidden"
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white md:grid"
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          {/* Section Label */}
          {!collapsed && (
            <div className="px-5 pb-2 pt-5">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Operação
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-amber-400 text-black shadow-[0_10px_30px_rgba(251,191,36,0.12)]'
                      : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && active && <ChevronRight size={15} className="ml-auto shrink-0" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer User Info */}
          <div className="border-t border-white/[0.07] p-3">
            {!collapsed ? (
              <>
                <div className="rounded-xl bg-white/[0.035] p-3">
                  <div className="truncate text-xs font-semibold text-slate-300">
                    {userEmail || 'Usuário da equipe'}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    {role === 'admin' ? 'Administrador' : 'Vendedor'}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between px-1 text-xs font-semibold text-slate-500">
                  <Link href="/" className="hover:text-white">
                    Ver site
                  </Link>
                  <form action="/auth/logout" method="post">
                    <button type="submit" className="hover:text-white">
                      Sair
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-1">
                <Link
                  href="/"
                  title="Ver site público"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <Globe size={16} />
                </Link>
                <form action="/auth/logout" method="post">
                  <button
                    type="submit"
                    title="Sair do painel"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  >
                    <LogOut size={16} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 hidden h-20 items-center justify-between border-b border-white/[0.07] bg-[#07090d]/88 px-6 backdrop-blur-xl md:flex lg:px-9">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                  Painel administrativo
                </div>
                <h1 className="mt-1 text-lg font-bold tracking-tight text-white">{pageTitle}</h1>
              </div>
            </div>

            <Link
              href={role === 'seller' ? '/admin/pdv' : '/admin/produtos/novo'}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-black hover:bg-amber-300"
            >
              {role === 'seller' ? 'Abrir PDV' : 'Novo produto'} <ChevronRight size={15} />
            </Link>
          </header>

          <div className="px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
            <div className="mx-auto w-full max-w-[1450px]">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
