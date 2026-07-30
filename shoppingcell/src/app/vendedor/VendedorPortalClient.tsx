'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import {
  Clock, DollarSign, ShoppingCart, UserPlus, LogOut,
  CheckCircle, ArrowUpRight, ArrowDownLeft, Printer, Search, Plus, Trash2, X
} from 'lucide-react';

type SellerSession = {
  id: string;
  name: string;
  role: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  sheet_code?: string;
  quantity?: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
};

function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return 'R$ 0.00';
  return `R$ ${Number(n).toFixed(2)}`;
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
  const [tab, setTab] = useState<'ponto' | 'caixa' | 'pdv' | 'cliente'>('pdv');

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
  const [closeCard, setCloseCard] = useState('');

  // PDV Vendas State
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{ product: Product; quantity: number; price: number }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao' | 'fiado'>('pix');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [savingSale, setSavingSale] = useState(false);

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
    } catch {
      router.push('/vendedor/login');
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('sc_seller_session');
    router.push('/vendedor/login');
  }

  // --- 1. PONTO DIGITAL HANDLERS ---
  async function handlePunchClock(type: 'in' | 'out') {
    if (!seller) return;
    const now = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (type === 'in') {
      setClockIn(timeStr);
      setPontoNotice(`Entrada registrada com sucesso às ${timeStr}!`);
    } else {
      setClockOut(timeStr);
      setPontoNotice(`Saída registrada com sucesso às ${timeStr}!`);
    }

    // Save into hr_attendance if table exists
    try {
      await supabase.from('hr_attendance').insert({
        employee_id: seller.id,
        day: new Date().toISOString().slice(0, 10),
        status: type === 'in' ? 'presente' : 'saida',
        note: `Ponto Digital registrado via Celular por ${seller.name} às ${timeStr}`,
      } as any);
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
    const cCard = Number(closeCard.replace(',', '.')) || 0;

    try {
      await supabase
        .from('cash_registers')
        .update({
          closed_at: new Date().toISOString(),
          final_cash: cCash,
          final_pix: cPix,
          final_card: cCard,
          status: 'closed',
        } as any)
        .eq('id', cashRegister.id);
    } catch {}

    setCashRegister(null);
    setModalCaixa(null);
    setCloseCash('');
    setClosePix('');
    setCloseCard('');
  }

  // --- 3. PDV VENDAS HANDLERS ---
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return initialProducts.slice(0, 25);
    return initialProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sheet_code?.toLowerCase().includes(q),
    );
  }, [search, initialProducts]);

  const [sellerToast, setSellerToast] = useState<string | null>(null);

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
    window.setTimeout(() => setSellerToast(null), 3000);
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
      // 1. Create sale in sales table
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

      // 2. Create sale_items
      const saleItems = cart.map((item) => ({
        sale_id: newSale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.price,
        discount: 0,
        total: item.quantity * item.price,
      }));

      await supabase.from('sale_items').insert(saleItems as any);

      // 3. Register transaction in finance_transactions
      await supabase.from('finance_transactions').insert({
        type: 'income',
        payment_method: paymentMethod,
        category: 'Vendas PDV Balcão',
        description: `Venda ${String(newSale.id).slice(0, 8)} [Vendedor: ${seller.name}]`,
        amount: cartTotal,
        occurred_at: new Date().toISOString(),
      } as any);

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
      setTab('pdv');
    }
  }

  if (!seller) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-100 pb-24">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-slate-950 font-black text-sm">
              {seller.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-black text-white">{seller.name}</div>
              <div className="text-[10px] text-slate-400">Vendedor • Portal Mobile</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="px-4 py-4">
        {/* TAB 1: PONTO DIGITAL */}
        {tab === 'ponto' && (
          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
              <Clock size={40} className="mx-auto text-yellow-400" />
              <h2 className="mt-3 text-lg font-black text-white">Ponto Digital de Trabalho</h2>
              <p className="mt-1 text-xs text-slate-400">
                Registre o horário exato da sua entrada e saída com 1 toque.
              </p>

              {pontoNotice && (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-200">
                  {pontoNotice}
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePunchClock('in')}
                  className="rounded-2xl border border-emerald-500/30 bg-emerald-500/20 py-4 text-sm font-extrabold text-emerald-300 transition active:scale-95 hover:bg-emerald-500/30"
                >
                  🟢 Entrar (Ponto)
                  {clockIn && <div className="mt-1 text-xs text-white">{clockIn}</div>}
                </button>

                <button
                  onClick={() => handlePunchClock('out')}
                  className="rounded-2xl border border-red-500/30 bg-red-500/20 py-4 text-sm font-extrabold text-red-300 transition active:scale-95 hover:bg-red-500/30"
                >
                  🔴 Saída (Ponto)
                  {clockOut && <div className="mt-1 text-xs text-white">{clockOut}</div>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CAIXA / SANGRIA */}
        {tab === 'caixa' && (
          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Status do Caixa</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span
                      className={
                        'h-3 w-3 rounded-full ' +
                        (cashRegister ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-red-400')
                      }
                    />
                    <span className="text-sm font-black text-white">
                      {cashRegister ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
                    </span>
                  </div>
                </div>

                {!cashRegister ? (
                  <button
                    onClick={() => setModalCaixa('abrir')}
                    className="rounded-2xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg"
                  >
                    + Abrir Caixa
                  </button>
                ) : (
                  <button
                    onClick={() => setModalCaixa('fechar')}
                    className="rounded-2xl border border-red-500/40 bg-red-500/20 px-4 py-2.5 text-xs font-bold text-red-200"
                  >
                    Fechar Caixa
                  </button>
                )}
              </div>

              {cashRegister && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
                    <span className="text-slate-400">Fundo Inicial:</span>
                    <div className="mt-1 text-sm font-extrabold text-yellow-400">
                      {money(cashRegister.initial_amount)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
                    <span className="text-slate-400">Vendedor:</span>
                    <div className="mt-1 text-sm font-bold text-white">{cashRegister.seller_name}</div>
                  </div>
                </div>
              )}
            </div>

            {cashRegister && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-white">Movimentações de Caixa</span>
                  <button
                    onClick={() => setModalCaixa('sangria')}
                    className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200"
                  >
                    + Sangria / Suprimento
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {movements.length === 0 ? (
                    <div className="text-xs text-slate-500">Nenhuma sangria ou suprimento registrado.</div>
                  ) : (
                    movements.map((m, i) => (
                      <div key={i} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-3 text-xs">
                        <div>
                          <span className={m.type === 'sangria' ? 'font-bold text-red-400' : 'font-bold text-green-400'}>
                            {m.type === 'sangria' ? '🔴 Sangria' : '🟢 Suprimento'}
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

        {/* TAB 3: PDV VENDEDOR */}
        {tab === 'pdv' && (
          <div className="grid gap-4">
            {lastSaleId ? (
              <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <CheckCircle size={48} className="mx-auto text-emerald-400" />
                <h3 className="mt-3 text-lg font-black text-white">Venda Realizada com Sucesso!</h3>
                <p className="mt-1 text-xs text-slate-300">Venda #{lastSaleId.slice(0, 8)} cadastrada no sistema.</p>

                <div className="mt-5 flex flex-col gap-2">
                  <a
                    href={`/admin/pdv/vendas/${lastSaleId}/comprovante`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-4 py-3 text-xs font-black text-slate-950"
                  >
                    <Printer size={16} /> Imprimir Comprovante (80mm)
                  </a>

                  <button
                    onClick={() => setLastSaleId(null)}
                    className="rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-bold text-slate-200"
                  >
                    + Nova Venda no Balcão
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

                {/* Search & Cart Header */}
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar produto por nome ou código…"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder-slate-500 focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                {/* Product List */}
                <div className="grid gap-2.5">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3.5 transition active:scale-98 hover:border-yellow-400/40"
                    >
                      <div>
                        <div className="text-xs font-extrabold text-white">{p.name}</div>
                        {p.sheet_code && <div className="text-[10px] text-slate-500">Cód: {p.sheet_code}</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-yellow-400">{money(p.price)}</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-400 text-slate-950">
                          <Plus size={16} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart Drawer */}
                {cart.length > 0 && (
                  <div className="fixed bottom-20 left-4 right-4 z-30 rounded-3xl border border-yellow-400/30 bg-slate-950/95 p-5 shadow-2xl backdrop-blur-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <span className="text-sm font-black text-white">Carrinho ({cart.length} itens)</span>
                      <button onClick={() => setCart([])} className="text-xs text-red-400 font-bold">
                        Limpar
                      </button>
                    </div>

                    <div className="my-3 max-h-36 overflow-y-auto space-y-2">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex items-center justify-between text-xs">
                          <span className="truncate max-w-[180px] text-slate-200">{item.product.name}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQty(item.product.id, -1)}
                              className="h-6 w-6 rounded-lg bg-white/10 text-slate-200 font-bold"
                            >
                              -
                            </button>
                            <span className="font-bold text-white">{item.quantity}</span>
                            <button
                              onClick={() => updateQty(item.product.id, 1)}
                              className="h-6 w-6 rounded-lg bg-white/10 text-slate-200 font-bold"
                            >
                              +
                            </button>
                            <span className="font-bold text-yellow-400">{money(item.quantity * item.price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Payment Method Selector */}
                    <div className="grid grid-cols-4 gap-1.5 my-3">
                      {(['pix', 'dinheiro', 'cartao', 'fiado'] as const).map((pm) => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => setPaymentMethod(pm)}
                          className={
                            'rounded-xl py-2 text-[11px] font-black uppercase ' +
                            (paymentMethod === pm
                              ? 'bg-yellow-400 text-slate-950'
                              : 'bg-white/5 text-slate-300 border border-white/10')
                          }
                        >
                          {pm}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Total a Pagar</div>
                        <div className="text-xl font-black text-yellow-400">{money(cartTotal)}</div>
                      </div>

                      <button
                        onClick={handleFinalizeSale}
                        disabled={savingSale}
                        className="rounded-2xl bg-yellow-400 px-6 py-3 text-xs font-black uppercase text-slate-950 shadow-xl"
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

        {/* TAB 4: NOVO CLIENTE */}
        {tab === 'cliente' && (
          <form onSubmit={handleAddCustomer} className="rounded-3xl border border-white/10 bg-white/5 p-6 grid gap-4">
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
                className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm font-semibold text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">WhatsApp / Telefone</label>
              <input
                type="text"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                placeholder="(88) 99999-9999"
                className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm font-semibold text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="mt-2 rounded-2xl bg-yellow-400 py-3.5 text-xs font-black uppercase text-slate-950 shadow-xl"
            >
              Salvar Cliente
            </button>
          </form>
        )}
      </main>

      {/* Modal Caixa */}
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
                    Confirmar Abertura
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

      {/* Mobile Fixed Bottom Navigation Bar */}
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
                  'flex flex-col items-center gap-1 py-1 text-[11px] font-extrabold transition ' +
                  (active ? 'text-yellow-400 scale-105' : 'text-slate-500 hover:text-slate-300')
                }
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
