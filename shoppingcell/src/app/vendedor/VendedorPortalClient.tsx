'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import {
  Clock, DollarSign, ShoppingCart, UserPlus, LogOut,
  CheckCircle, ArrowUpRight, ArrowDownLeft, Printer, Search, Plus, Trash2, X,
  UserCheck, ShieldCheck, CreditCard, Banknote, Sparkles, Store, ChevronRight, User
} from 'lucide-react';

type SellerSession = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  sheet_code?: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
};

function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return 'R$ 0,00';
  return `R$ ${Number(n).toFixed(2).replace('.', ',')}`;
}

export function VendedorPortalClient({
  initialProducts = [],
  initialCustomers = [],
}: {
  initialProducts: Product[];
  initialCustomers: Customer[];
}) {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerSession | null>(null);
  const [tab, setTab] = useState<'pdv' | 'caixa' | 'ponto' | 'cliente'>('pdv');

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ponto Digital State
  const [clockIn, setClockIn] = useState<string | null>(null);
  const [clockOut, setClockOut] = useState<string | null>(null);
  const [pontoNotice, setPontoNotice] = useState<string | null>(null);

  // Caixa State
  const [cashRegister, setCashRegister] = useState<any>(null);
  const [openAmount, setOpenAmount] = useState('');
  const [movementType, setMovementType] = useState<'sangria' | 'suprimento'>('sangria');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movements, setMovements] = useState<any[]>([]);
  const [modalCaixa, setModalCaixa] = useState<null | 'abrir' | 'sangria' | 'fechar'>(null);

  // Fechamento conferência
  const [closeCash, setCloseCash] = useState('');
  const [closePix, setClosePix] = useState('');

  // PDV Vendas State
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{ product: Product; quantity: number; price: number }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao' | 'fiado'>('pix');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [savingSale, setSavingSale] = useState(false);
  const [sellerToast, setSellerToast] = useState<string | null>(null);
  const [todaySalesTotal, setTodaySalesTotal] = useState<number>(0);
  const [todaySalesCount, setTodaySalesCount] = useState<number>(0);

  // Novo Cliente State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [customersList, setCustomersList] = useState<Customer[]>(initialCustomers);

  // Check seller session on mount
  useEffect(() => {
    const raw = localStorage.getItem('sc_seller_session');
    if (!raw) {
      router.push('/vendedor/login');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setSeller(parsed);

      // Sincroniza em staff_profiles para garantir o nome correto no comprovante
      if (parsed.id && parsed.name) {
        supabase
          .from('staff_profiles')
          .upsert({ user_id: parsed.id, display_name: parsed.name, role: parsed.role || 'staff', active: true } as any, {
            onConflict: 'user_id',
          })
          .then(() => null, () => null);
      }
    } catch {
      router.push('/vendedor/login');
    }
  }, [router]);

  // Carrega caixa aberto e vendas do dia
  useEffect(() => {
    if (!seller?.id) return;

    // 1. Busca caixa aberto do vendedor
    supabase
      .from('cash_registers')
      .select('*')
      .eq('seller_id', seller.id)
      .eq('status', 'open')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCashRegister(data);
      });

    // 2. Busca totais de vendas do dia
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('sales')
      .select('total')
      .eq('seller_id', seller.id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .then(({ data }) => {
        if (data) {
          setTodaySalesCount(data.length);
          const totalSum = data.reduce((acc, item) => acc + Number(item.total || 0), 0);
          setTodaySalesTotal(totalSum);
        }
      });
  }, [seller]);

  function handleLogout() {
    localStorage.removeItem('sc_seller_session');
    router.push('/vendedor/login');
  }

  // --- 1. PONTO DIGITAL HANDLERS ---
  async function handlePunchClock(type: 'in' | 'out') {
    if (!seller) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dayStr = now.toISOString().slice(0, 10);

    if (type === 'in') {
      setClockIn(timeStr);
      setPontoNotice(`Entrada registrada às ${timeStr}! Dados enviados ao RH.`);
    } else {
      setClockOut(timeStr);
      setPontoNotice(`Saída registrada às ${timeStr}! Dados enviados ao RH.`);
    }

    // Registra na tabela hr_attendance para aparecer no Painel de RH do Admin
    try {
      await supabase.from('hr_attendance').upsert(
        {
          employee_id: seller.id,
          day: dayStr,
          status: type === 'in' ? 'present' : 'saida',
          note: `Ponto Digital App: ${type === 'in' ? 'Entrada' : 'Saída'} às ${timeStr} por ${seller.name}`,
        } as any,
        { onConflict: 'employee_id,day' },
      );
    } catch {}
  }

  // --- 2. CAIXA HANDLERS ---
  async function handleAbrirCaixa() {
    if (!seller) return;
    const initial = Number(openAmount.replace(',', '.')) || 0;
    const newReg = {
      seller_id: seller.id,
      seller_name: seller.name,
      initial_amount: initial,
      status: 'open',
      opened_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('cash_registers').insert(newReg as any).select().single();
    if (!error && data) {
      setCashRegister(data);
    } else {
      setCashRegister({ ...newReg, id: 'temp-' + Date.now() });
    }

    setModalCaixa(null);
    setOpenAmount('');
  }

  async function handleLancarMovimento() {
    if (!seller) return;
    const amt = Number(movementAmount.replace(',', '.')) || 0;
    if (amt <= 0) return;

    const mov = {
      cash_register_id: cashRegister?.id,
      seller_id: seller.id,
      type: movementType,
      amount: amt,
      description: movementReason.trim() || (movementType === 'sangria' ? 'Sangria de Caixa' : 'Suprimento de Troco'),
      created_at: new Date().toISOString(),
    };

    setMovements((prev) => [mov, ...prev]);

    try {
      await supabase.from('cash_movements').insert(mov as any);
    } catch {}

    setModalCaixa(null);
    setMovementAmount('');
    setMovementReason('');
  }

  async function handleFecharCaixa() {
    if (!seller || !cashRegister) return;
    const cCash = Number(closeCash.replace(',', '.')) || 0;
    const cPix = Number(closePix.replace(',', '.')) || 0;

    try {
      await supabase
        .from('cash_registers')
        .update({
          closed_at: new Date().toISOString(),
          final_cash: cCash,
          final_pix: cPix,
          status: 'closed',
        } as any)
        .eq('id', cashRegister.id);
    } catch {}

    setCashRegister(null);
    setModalCaixa(null);
    setCloseCash('');
    setClosePix('');
  }

  // --- 3. PDV VENDAS HANDLERS ---
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return initialProducts.slice(0, 30);
    return initialProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sheet_code?.toLowerCase().includes(q),
    );
  }, [search, initialProducts]);

  function addToCart(p: Product) {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [...prev, { product: p, quantity: 1, price: p.price }];
    });

    setSellerToast(`🛒 ${p.name} adicionado ao carrinho!`);
    window.setTimeout(() => setSellerToast(null), 2500);
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nq = item.quantity + delta;
            return nq > 0 ? { ...item, quantity: nq } : null;
          }
          return item;
        })
        .filter(Boolean) as any,
    );
  }

  const cartTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity * item.price, 0),
    [cart],
  );

  async function handleFinalizeSale() {
    if (!seller || cart.length === 0 || savingSale) return;
    setSavingSale(true);

    try {
      // 1. Garante que staff_profiles tem o vendedor cadastrado com nome correto
      await supabase
        .from('staff_profiles')
        .upsert(
          { user_id: seller.id, display_name: seller.name, role: seller.role || 'staff', active: true } as any,
          { onConflict: 'user_id' },
        )
        .then(() => null, () => null);

      // 2. Insere a venda na tabela sales
      const { data: newSale, error: saleErr } = await supabase
        .from('sales')
        .insert({
          total: cartTotal,
          subtotal: cartTotal,
          discount_total: 0,
          payment_method: paymentMethod,
          status: 'CONCLUÍDA',
          seller_id: seller.id,
          customer_id: selectedCustomer || null,
          paid_amount: cartTotal,
          received_amount: paymentMethod === 'dinheiro' ? Number(receivedAmount) || cartTotal : cartTotal,
          change_amount:
            paymentMethod === 'dinheiro' ? Math.max(0, (Number(receivedAmount) || cartTotal) - cartTotal) : 0,
        } as any)
        .select()
        .single();

      if (saleErr) throw new Error(saleErr.message);

      // 3. Insere os itens da venda em sale_items
      const saleItems = cart.map((item) => ({
        sale_id: newSale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.price,
        discount: 0,
        total: item.quantity * item.price,
      }));

      await supabase.from('sale_items').insert(saleItems as any);

      // 4. Registra no Financeiro do Admin
      await supabase.from('finance_transactions').insert({
        type: 'income',
        payment_method: paymentMethod,
        category: 'Vendas PDV Balcão',
        description: `Venda #${String(newSale.id).slice(0, 8)} [Vendedor: ${seller.name}]`,
        amount: cartTotal,
        occurred_at: new Date().toISOString(),
      } as any);

      // Atualiza KPIs locais do vendedor
      setTodaySalesTotal((prev) => prev + cartTotal);
      setTodaySalesCount((prev) => prev + 1);

      setLastSaleId(newSale.id);
      setCart([]);
    } catch (err: any) {
      alert('Erro ao finalizar venda: ' + err.message);
    } finally {
      setSavingSale(false);
    }
  }

  // --- 4. CADASTRO DE CLIENTE HANDLER ---
  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const { data: c, error } = await supabase
      .from('customers')
      .insert({ name: newCustName.trim(), phone: newCustPhone.trim() } as any)
      .select()
      .single();

    if (!error && c) {
      setCustomersList((prev) => [c, ...prev]);
      setSelectedCustomer(c.id);
      setNewCustName('');
      setNewCustPhone('');
      setSellerToast(`✅ Cliente ${c.name} cadastrado com sucesso!`);
      setTab('pdv');
    }
  }

  if (!seller) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 select-none font-sans">
      {/* APP TOP BAR HEADER */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur-2xl px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 font-black text-base shadow-lg shadow-yellow-500/20">
              {seller.name.slice(0, 2).toUpperCase()}
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white">{seller.name}</span>
                <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[9px] font-extrabold uppercase text-yellow-300">
                  {seller.role === 'owner' ? 'Admin' : 'Vendedor'}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Clock size={11} className="text-yellow-400" /> {currentTime || 'Shopping Cell App'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 active:scale-95 hover:bg-white/10"
          >
            <LogOut size={14} className="text-red-400" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* QUICK STATUS DASHBOARD BAR */}
      <section className="px-4 pt-3.5 pb-1">
        <div className="grid grid-cols-3 gap-2">
          {/* Sales KPI */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Vendas Hoje</div>
            <div className="mt-0.5 text-sm font-black text-yellow-400">{money(todaySalesTotal)}</div>
            <div className="text-[9px] text-slate-500">{todaySalesCount} pedido(s)</div>
          </div>

          {/* Caixa Status */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Status Caixa</div>
            <div className="mt-0.5 flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${cashRegister ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-red-400'}`} />
              <span className="text-xs font-black text-white">{cashRegister ? 'Aberto' : 'Fechado'}</span>
            </div>
            <div className="text-[9px] text-slate-500">{cashRegister ? money(cashRegister.initial_amount) : 'Fundo: R$ 0'}</div>
          </div>

          {/* Ponto Status */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Ponto Digital</div>
            <div className="mt-0.5 text-xs font-black text-emerald-400">{clockIn ? clockIn : 'Não marcado'}</div>
            <div className="text-[9px] text-slate-500">{clockOut ? `Saída: ${clockOut}` : 'Presença RH'}</div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT CONTAINERS */}
      <main className="px-4 py-3">
        {/* ========================================================================= */}
        {/* TAB 1: PDV VENDAS */}
        {/* ========================================================================= */}
        {tab === 'pdv' && (
          <div className="grid gap-3.5">
            {lastSaleId ? (
              <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center shadow-2xl animate-in zoom-in-95">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mx-auto text-emerald-400">
                  <CheckCircle size={40} />
                </div>
                <h3 className="mt-3 text-lg font-black text-white">Venda Realizada com Sucesso!</h3>
                <p className="mt-1 text-xs text-slate-300">Venda #{lastSaleId.slice(0, 8)} cadastrada no sistema.</p>

                <div className="mt-6 grid gap-2.5">
                  <a
                    href={`/admin/pdv/vendas/${lastSaleId}/comprovante`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-400 py-3.5 text-xs font-black uppercase text-slate-950 shadow-xl active:scale-95"
                  >
                    <Printer size={18} /> Imprimir Comprovante (80mm)
                  </a>

                  <button
                    onClick={() => setLastSaleId(null)}
                    className="rounded-2xl border border-white/10 bg-white/5 py-3.5 text-xs font-bold text-slate-200 active:scale-95 hover:bg-white/10"
                  >
                    + Iniciar Nova Venda no Balcão
                  </button>
                </div>
              </div>
            ) : (
              <>
                {sellerToast && (
                  <div className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-3 text-center text-xs font-black text-yellow-300 shadow-lg animate-in fade-in slide-in-from-top-2">
                    {sellerToast}
                  </div>
                )}

                {/* Customer Selector & Add Customer Bar */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1.5">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <User size={14} className="text-yellow-400" /> Cliente na Venda:
                    </span>
                    <button
                      type="button"
                      onClick={() => setTab('cliente')}
                      className="text-[11px] font-extrabold text-yellow-400 hover:underline"
                    >
                      + Novo Cliente
                    </button>
                  </div>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-2.5 text-xs font-semibold text-white focus:border-yellow-400 focus:outline-none"
                  >
                    <option value="">Cliente Geral (Balcão)</option>
                    {customersList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar produto por nome ou código…"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder-slate-500 focus:border-yellow-400 focus:outline-none"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3.5 top-3.5 text-slate-400">
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Product Cards List */}
                <div className="grid gap-2">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3.5 transition active:scale-98 hover:border-yellow-400/40"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate text-xs font-extrabold text-white">{p.name}</div>
                        {p.sheet_code && <div className="text-[10px] text-slate-400">Cód: {p.sheet_code}</div>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className="text-sm font-black text-yellow-400">{money(p.price)}</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-400 text-slate-950 shadow-md">
                          <Plus size={16} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CART FLOATING BAR / DRAWER */}
                {cart.length > 0 && (
                  <div className="fixed bottom-20 left-3 right-3 z-30 rounded-3xl border border-yellow-400/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        <ShoppingCart size={16} className="text-yellow-400" /> Carrinho ({cart.length} itens)
                      </span>
                      <button onClick={() => setCart([])} className="text-[11px] font-bold text-red-400">
                        Limpar
                      </button>
                    </div>

                    <div className="my-2.5 max-h-32 overflow-y-auto space-y-1.5 pr-1">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex items-center justify-between text-xs">
                          <span className="truncate max-w-[170px] text-slate-200">{item.product.name}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateQty(item.product.id, -1)}
                              className="h-6 w-6 rounded-lg bg-white/10 text-slate-200 font-bold active:bg-white/20"
                            >
                              -
                            </button>
                            <span className="font-extrabold text-white">{item.quantity}</span>
                            <button
                              onClick={() => updateQty(item.product.id, 1)}
                              className="h-6 w-6 rounded-lg bg-white/10 text-slate-200 font-bold active:bg-white/20"
                            >
                              +
                            </button>
                            <span className="font-extrabold text-yellow-400">{money(item.quantity * item.price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Forma de Pagamento */}
                    <div className="grid grid-cols-4 gap-1 my-2">
                      {(['pix', 'dinheiro', 'cartao', 'fiado'] as const).map((pm) => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => setPaymentMethod(pm)}
                          className={
                            'rounded-xl py-1.5 text-[10px] font-black uppercase tracking-wider ' +
                            (paymentMethod === pm
                              ? 'bg-yellow-400 text-slate-950 shadow-md'
                              : 'bg-white/5 text-slate-300 border border-white/10')
                          }
                        >
                          {pm}
                        </button>
                      ))}
                    </div>

                    {/* Finalize Button */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Total a Pagar</div>
                        <div className="text-lg font-black text-yellow-400">{money(cartTotal)}</div>
                      </div>

                      <button
                        onClick={handleFinalizeSale}
                        disabled={savingSale}
                        className="rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-400 px-5 py-3 text-xs font-black uppercase text-slate-950 shadow-xl active:scale-95"
                      >
                        {savingSale ? 'Concluindo…' : 'Finalizar Venda'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CAIXA & SANGRIA */}
        {/* ========================================================================= */}
        {tab === 'caixa' && (
          <div className="grid gap-3.5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400">Status do Caixa</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={
                        'h-3.5 w-3.5 rounded-full ' +
                        (cashRegister ? 'bg-green-400 shadow-[0_0_12px_#4ade80]' : 'bg-red-400')
                      }
                    />
                    <span className="text-base font-black text-white">
                      {cashRegister ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
                    </span>
                  </div>
                </div>

                {!cashRegister ? (
                  <button
                    onClick={() => setModalCaixa('abrir')}
                    className="rounded-2xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg active:scale-95"
                  >
                    + Abrir Caixa
                  </button>
                ) : (
                  <button
                    onClick={() => setModalCaixa('fechar')}
                    className="rounded-2xl border border-red-500/40 bg-red-500/20 px-4 py-2.5 text-xs font-bold text-red-200 active:scale-95"
                  >
                    Fechar Caixa
                  </button>
                )}
              </div>

              {cashRegister && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <span className="text-slate-400 font-semibold">Fundo Inicial:</span>
                    <div className="mt-0.5 text-sm font-extrabold text-yellow-400">
                      {money(cashRegister.initial_amount)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <span className="text-slate-400 font-semibold">Operador:</span>
                    <div className="mt-0.5 text-sm font-bold text-white truncate">{cashRegister.seller_name}</div>
                  </div>
                </div>
              )}
            </div>

            {cashRegister && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-white tracking-wide">
                    Sangrias e Suprimentos
                  </span>
                  <button
                    onClick={() => setModalCaixa('sangria')}
                    className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 active:scale-95"
                  >
                    + Lançar
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {movements.length === 0 ? (
                    <div className="text-xs text-slate-500 py-2">Nenhuma sangria ou suprimento registrado.</div>
                  ) : (
                    movements.map((m, i) => (
                      <div key={i} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-xs">
                        <div>
                          <span className={m.type === 'sangria' ? 'font-bold text-red-400' : 'font-bold text-green-400'}>
                            {m.type === 'sangria' ? '🔴 Sangria (Retirada)' : '🟢 Suprimento (Entrada)'}
                          </span>
                          <div className="text-[11px] text-slate-400">{m.description}</div>
                        </div>
                        <span className="font-extrabold text-white">{money(m.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PONTO DIGITAL */}
        {/* ========================================================================= */}
        {tab === 'ponto' && (
          <div className="grid gap-3.5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400/20 text-yellow-400 mx-auto">
                <Clock size={36} />
              </div>

              <h2 className="mt-3 text-lg font-black text-white">Ponto Digital do Funcionário</h2>
              <div className="mt-1 font-mono text-2xl font-black text-yellow-400 tracking-wider">
                {currentTime || '00:00:00'}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Data: {new Date().toLocaleDateString('pt-BR')} — Registra entrada/saída no painel do RH.
              </p>

              {pontoNotice && (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-200 animate-in fade-in">
                  {pontoNotice}
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePunchClock('in')}
                  className="rounded-2xl border border-emerald-500/30 bg-emerald-500/20 py-4 text-xs font-extrabold text-emerald-300 transition active:scale-95 hover:bg-emerald-500/30"
                >
                  🟢 Entrar (Ponto)
                  {clockIn && <div className="mt-1 text-sm font-black text-white">{clockIn}</div>}
                </button>

                <button
                  onClick={() => handlePunchClock('out')}
                  className="rounded-2xl border border-red-500/30 bg-red-500/20 py-4 text-xs font-extrabold text-red-300 transition active:scale-95 hover:bg-red-500/30"
                >
                  🔴 Saída (Ponto)
                  {clockOut && <div className="mt-1 text-sm font-black text-white">{clockOut}</div>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CADASTRO DE CLIENTE */}
        {/* ========================================================================= */}
        {tab === 'cliente' && (
          <form onSubmit={handleAddCustomer} className="rounded-3xl border border-white/10 bg-white/5 p-6 grid gap-4 shadow-xl">
            <div className="flex items-center gap-2 text-base font-black text-white">
              <UserPlus size={22} className="text-yellow-400" /> Cadastro Rápido de Cliente
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Nome Completo</label>
              <input
                type="text"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                placeholder="Ex: Maria Oliveira"
                required
                className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-950 py-3 px-4 text-sm font-semibold text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">WhatsApp / Telefone</label>
              <input
                type="text"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                placeholder="(88) 99999-9999"
                className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-950 py-3 px-4 text-sm font-semibold text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="mt-2 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-400 py-3.5 text-xs font-black uppercase text-slate-950 shadow-xl active:scale-95"
            >
              Salvar Cliente e Selecionar na Venda
            </button>
          </form>
        )}
      </main>

      {/* MODAL CAIXA */}
      {modalCaixa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-black text-white">
                {modalCaixa === 'abrir' ? 'Abrir Caixa' : modalCaixa === 'sangria' ? 'Sangria / Suprimento' : 'Fechar Caixa'}
              </span>
              <button onClick={() => setModalCaixa(null)} className="text-slate-400"><X size={18} /></button>
            </div>

            <div className="mt-4 grid gap-3">
              {modalCaixa === 'abrir' && (
                <>
                  <label className="text-xs text-slate-400">Fundo de Troco Inicial (R$)</label>
                  <input
                    type="text"
                    value={openAmount}
                    onChange={(e) => setOpenAmount(e.target.value)}
                    placeholder="100.00"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white font-mono"
                  />
                  <button onClick={handleAbrirCaixa} className="mt-2 rounded-2xl bg-yellow-400 py-3 text-xs font-black text-slate-950">
                    Confirmar Abertura de Caixa
                  </button>
                </>
              )}

              {modalCaixa === 'sangria' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMovementType('sangria')}
                      className={'rounded-xl py-2 text-xs font-bold ' + (movementType === 'sangria' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-white/5 text-slate-400')}
                    >
                      Sangria (Retirada)
                    </button>
                    <button
                      onClick={() => setMovementType('suprimento')}
                      className={'rounded-xl py-2 text-xs font-bold ' + (movementType === 'suprimento' ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-white/5 text-slate-400')}
                    >
                      Suprimento (Entrada)
                    </button>
                  </div>
                  <input
                    type="text"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    placeholder="Valor R$"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white font-mono"
                  />
                  <input
                    type="text"
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    placeholder="Motivo (ex: Pagamento motoboy)"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white"
                  />
                  <button onClick={handleLancarMovimento} className="mt-2 rounded-2xl bg-yellow-400 py-3 text-xs font-black text-slate-950">
                    Salvar Movimentação
                  </button>
                </>
              )}

              {modalCaixa === 'fechar' && (
                <>
                  <label className="text-xs text-slate-400">Total Conferido em Dinheiro (R$)</label>
                  <input
                    type="text"
                    value={closeCash}
                    onChange={(e) => setCloseCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white font-mono"
                  />
                  <label className="text-xs text-slate-400">Total Conferido em PIX (R$)</label>
                  <input
                    type="text"
                    value={closePix}
                    onChange={(e) => setClosePix(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white font-mono"
                  />
                  <button onClick={handleFecharCaixa} className="mt-2 rounded-2xl bg-red-500 py-3 text-xs font-black text-white">
                    Confirmar Fechamento de Caixa
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE FIXED BOTTOM APP NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl">
        <div className="grid grid-cols-4 py-2">
          {[
            { id: 'pdv', label: 'Vendas', icon: ShoppingCart },
            { id: 'caixa', label: 'Caixa', icon: DollarSign },
            { id: 'ponto', label: 'Ponto', icon: Clock },
            { id: 'cliente', label: 'Cliente', icon: UserPlus },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id as any)}
                className={
                  'flex flex-col items-center gap-1 py-1 text-[11px] font-extrabold transition relative ' +
                  (active ? 'text-yellow-400 scale-105' : 'text-slate-500 hover:text-slate-300')
                }
              >
                <Icon size={20} />
                <span>{item.label}</span>

                {item.id === 'pdv' && cart.length > 0 && (
                  <span className="absolute top-0 right-5 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-black text-slate-950 shadow-md">
                    {cart.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
