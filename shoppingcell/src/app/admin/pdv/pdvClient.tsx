'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  Barcode,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  History,
  Minus,
  Package,
  Pause,
  Play,
  Plus,
  QrCode,
  ReceiptText,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import {
  calculateSaleTotals,
  extractSaleId,
  nextCartQuantity,
  parseMoney,
  validateCheckout,
  type OrderDiscount,
} from '@/lib/pdvRules';

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sheet_code: string | null;
  barcode: string | null;
  active: boolean;
  quantity: number;
  minQuantity: number;
  categoryName: string | null;
  mediaUrl: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  isWalkin: boolean;
};

type Metrics = {
  recentSales: number;
  recentTotal: number;
  lowStock: number;
  outOfStock: number;
};

type CartItem = { product: ProductRow; quantity: number; discount: number };
type PaymentMethod = 'pix' | 'dinheiro' | 'fiado';
type StockFilter = 'available' | 'low' | 'all';
type StoredItem = { productId: string; quantity: number; discount: number };
type HeldSale = {
  id: string;
  createdAt: string;
  label: string;
  items: StoredItem[];
  customerName: string;
  customerPhone: string;
  orderDiscount: OrderDiscount;
};

const ACTIVE_CART_KEY = 'shoppingcell:pdv:active:v2';
const HELD_SALES_KEY = 'shoppingcell:pdv:held:v2';
const digits = (value: string) => value.replace(/\D/g, '');
const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const isVideo = (url: string | null) => Boolean(url && /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(url));
const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function ProductMedia({ product }: { product: ProductRow }) {
  if (!product.mediaUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-600">
        <Package size={20} />
      </div>
    );
  }
  if (isVideo(product.mediaUrl)) {
    return (
      <div className="relative h-full w-full bg-slate-950">
        <video src={product.mediaUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
          <Play size={18} fill="currentColor" />
        </span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={product.mediaUrl} alt="" className="h-full w-full object-cover" />;
}

function MetricCard({ label, value, detail, tone = 'default' }: {
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'warning' | 'danger';
}) {
  const tones = {
    default: 'border-white/10 bg-white/[0.04] text-white',
    warning: 'border-amber-400/20 bg-amber-400/[0.07] text-amber-200',
    danger: 'border-red-400/20 bg-red-400/[0.07] text-red-200',
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{detail}</div>
    </div>
  );
}

export function PdvClient({ products, customers, metrics }: {
  products: ProductRow[];
  customers: CustomerRow[];
  metrics: Metrics;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [stockFilter, setStockFilter] = useState<StockFilter>('available');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [stockById, setStockById] = useState<Record<string, number>>(() =>
    Object.fromEntries(products.map((product) => [product.id, product.quantity])),
  );
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [orderDiscount, setOrderDiscount] = useState<OrderDiscount>({ mode: 'value', value: 0 });
  const [discountInput, setDiscountInput] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [paidNow, setPaidNow] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date(Date.now() + 30 * 86400000);
    return date.toISOString().slice(0, 10);
  });
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [heldOpen, setHeldOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const categories = useMemo(
    () => ['Todas', ...Array.from(new Set(products.map((product) => product.categoryName).filter(Boolean) as string[])).sort()],
    [products],
  );

  useEffect(() => {
    setStockById(Object.fromEntries(products.map((product) => [product.id, product.quantity])));
  }, [products]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ACTIVE_CART_KEY) || 'null');
      if (saved?.items) {
        const restored = (saved.items as StoredItem[]).flatMap((item) => {
          const product = productById.get(item.productId);
          const stock = product ? stockById[product.id] ?? product.quantity : 0;
          if (!product || stock <= 0) return [];
          return [{ product, quantity: Math.min(Math.max(1, item.quantity), stock), discount: Math.max(0, item.discount || 0) }];
        });
        setCart(restored);
        setCustomerName(saved.customerName || '');
        setCustomerPhone(saved.customerPhone || '');
        if (saved.orderDiscount) {
          setOrderDiscount(saved.orderDiscount);
          setDiscountInput(String(saved.orderDiscount.value || ''));
        }
      }
      const held = JSON.parse(localStorage.getItem(HELD_SALES_KEY) || '[]');
      if (Array.isArray(held)) setHeldSales(held);
    } catch {
      localStorage.removeItem(ACTIVE_CART_KEY);
      localStorage.removeItem(HELD_SALES_KEY);
    } finally {
      setHydrated(true);
    }
  // Stock is intentionally captured only on initial hydration.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productById]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(ACTIVE_CART_KEY, JSON.stringify({
      items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity, discount: item.discount })),
      customerName,
      customerPhone,
      orderDiscount,
    }));
  }, [cart, customerName, customerPhone, orderDiscount, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(HELD_SALES_KEY, JSON.stringify(heldSales));
  }, [heldSales, hydrated]);

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setQuery('');
        setError(null);
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', shortcuts);
    return () => window.removeEventListener('keydown', shortcuts);
  }, []);

  const filteredProducts = useMemo(() => {
    const term = normalize(query);
    return products.filter((product) => {
      const stock = stockById[product.id] ?? product.quantity;
      if (category !== 'Todas' && product.categoryName !== category) return false;
      if (stockFilter === 'available' && stock <= 0) return false;
      if (stockFilter === 'low' && !(stock > 0 && stock <= product.minQuantity)) return false;
      if (!term) return true;
      return normalize(`${product.name} ${product.sheet_code || ''} ${product.barcode || ''}`).includes(term);
    }).slice(0, 80);
  }, [products, query, category, stockFilter, stockById]);

  const filteredCustomers = useMemo(() => {
    const term = normalize(customerQuery);
    const phone = digits(customerQuery);
    return customers.filter((customer) =>
      !term || normalize(customer.name).includes(term) || Boolean(phone && digits(customer.phone || '').includes(phone)),
    ).slice(0, 40);
  }, [customers, customerQuery]);

  const totals = useMemo(() => calculateSaleTotals(
    cart.map((item) => ({ quantity: item.quantity, unitPrice: item.product.price, discount: item.discount })),
    orderDiscount,
  ), [cart, orderDiscount]);

  const cashValue = cashReceived.trim() ? parseMoney(cashReceived) : totals.total;
  const change = payment === 'dinheiro' ? Math.max(0, cashValue - totals.total) : 0;

  function addProduct(product: ProductRow) {
    const stock = stockById[product.id] ?? product.quantity;
    const current = cart.find((item) => item.product.id === product.id)?.quantity ?? 0;
    if (stock <= 0) return setError(`${product.name} está sem estoque.`);
    if (current >= stock) return setError(`Limite de estoque atingido para ${product.name}.`);
    setError(null);
    setNotice(`${product.name} adicionado.`);
    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (!existing) return [...items, { product, quantity: 1, discount: 0 }];
      const next = nextCartQuantity(existing.quantity, 1, stock);
      return items.map((item) => item.product.id === product.id ? { ...item, quantity: next.quantity } : item);
    });
    setTimeout(() => setNotice(null), 1600);
    searchRef.current?.focus();
  }

  function handleSearchEnter() {
    const term = normalize(query);
    if (!term) return;
    const exact = products.find((product) =>
      normalize(product.sheet_code || '') === term || normalize(product.barcode || '') === term,
    );
    const product = exact || (filteredProducts.length === 1 ? filteredProducts[0] : null);
    if (!product) return setError('Código não encontrado. Refine a busca e selecione o produto.');
    addProduct(product);
    setQuery('');
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((items) => items.map((item) => {
      if (item.product.id !== productId) return item;
      const stock = stockById[productId] ?? item.product.quantity;
      return { ...item, quantity: nextCartQuantity(item.quantity, delta, stock).quantity };
    }));
  }

  function setItemDiscount(productId: string, raw: string) {
    const value = parseMoney(raw);
    setCart((items) => items.map((item) => item.product.id === productId
      ? { ...item, discount: Math.min(value, item.product.price * item.quantity) }
      : item));
  }

  function clearSale(ask = true) {
    if (ask && cart.length && !window.confirm('Limpar todos os itens desta venda?')) return;
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerQuery('');
    setOrderDiscount({ mode: 'value', value: 0 });
    setDiscountInput('');
    setCashReceived('');
    setPaidNow('');
    setPayment('pix');
    setError(null);
  }

  function holdCurrentSale() {
    if (!cart.length) return setError('Adicione itens antes de colocar a venda em espera.');
    const hold: HeldSale = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      label: customerName || `Venda com ${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'itens'}`,
      items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity, discount: item.discount })),
      customerName,
      customerPhone,
      orderDiscount,
    };
    setHeldSales((items) => [hold, ...items].slice(0, 20));
    clearSale(false);
    setNotice('Venda colocada em espera.');
  }

  function restoreHeldSale(hold: HeldSale) {
    if (cart.length) return setError('Limpe ou coloque a venda atual em espera antes de restaurar outra.');
    const restored = hold.items.flatMap((item) => {
      const product = productById.get(item.productId);
      const stock = product ? stockById[product.id] ?? product.quantity : 0;
      if (!product || stock <= 0) return [];
      return [{ product, quantity: Math.min(item.quantity, stock), discount: item.discount }];
    });
    if (!restored.length) return setError('Os produtos desta venda não possuem mais estoque.');
    setCart(restored);
    setCustomerName(hold.customerName);
    setCustomerPhone(hold.customerPhone);
    setCustomerQuery(hold.customerName);
    setOrderDiscount(hold.orderDiscount);
    setDiscountInput(String(hold.orderDiscount.value || ''));
    setHeldSales((items) => items.filter((item) => item.id !== hold.id));
    setHeldOpen(false);
    setNotice('Venda restaurada. Quantidades foram conferidas com o estoque atual.');
  }

  async function finishSale() {
    setError(null);
    setNotice(null);
    const validation = validateCheckout({
      items: cart.map((item) => ({ quantity: item.quantity, stock: stockById[item.product.id] ?? 0 })),
      payment,
      total: totals.total,
      cashReceived: cashValue,
      customerName,
      customerPhone,
      dueDate,
    });
    if (validation) return setError(validation);

    const paidNowValue = payment === 'fiado' ? Math.min(totals.total, Math.max(0, parseMoney(paidNow))) : totals.total;
    setSaving(true);
    const { data, error: rpcError } = await supabase.rpc('pdv_create_sale', {
      p_payment_method: payment,
      p_items: cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        discount: item.discount,
      })),
      p_customer: customerName || customerPhone ? { name: customerName, phone: digits(customerPhone) } : null,
      p_discount_total: totals.orderDiscount,
      p_paid_amount: paidNowValue,
      p_due_date: payment === 'fiado' ? dueDate : null,
    } as any);
    setSaving(false);

    if (rpcError) return setError(rpcError.message || 'Não foi possível concluir a venda.');
    const saleId = extractSaleId(data);
    if (!saleId) return setError('Venda criada, mas o identificador não foi devolvido pelo banco.');

    setStockById((stock) => {
      const next = { ...stock };
      for (const item of cart) next[item.product.id] = Math.max(0, (next[item.product.id] ?? 0) - item.quantity);
      return next;
    });
    setLastSaleId(saleId);
    clearSale(false);
    setNotice('Venda concluída e estoque atualizado com sucesso.');
    router.refresh();
  }

  const paymentOptions: Array<{ id: PaymentMethod; label: string; detail: string; icon: typeof QrCode }> = [
    { id: 'pix', label: 'PIX', detail: 'Pagamento imediato', icon: QrCode },
    { id: 'dinheiro', label: 'Dinheiro', detail: 'Calcula o troco', icon: Banknote },
    { id: 'fiado', label: 'Fiado', detail: 'Gera conta a receber', icon: WalletCards },
  ];

  return (
    <div className="grid gap-4">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Vendas" value={String(metrics.recentSales)} detail="registros recentes" />
        <MetricCard label="Faturamento" value={money(metrics.recentTotal)} detail="registros recentes" />
        <MetricCard label="Estoque baixo" value={String(metrics.lowStock)} detail="itens no mínimo" tone="warning" />
        <MetricCard label="Sem estoque" value={String(metrics.outOfStock)} detail="itens indisponíveis" tone="danger" />
      </section>

      {(error || notice) && (
        <div className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-bold ${
          error ? 'border-red-400/25 bg-red-400/10 text-red-100' : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
        }`}>
          <div className="flex items-center gap-2">
            {error ? <X size={18} /> : <CheckCircle2 size={18} />}
            <span>{error || notice}</span>
          </div>
          <button type="button" onClick={() => { setError(null); setNotice(null); }} aria-label="Fechar aviso"><X size={16} /></button>
        </div>
      )}

      {lastSaleId && (
        <div className="flex flex-col gap-3 rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-black text-yellow-100">Venda concluída</div>
            <div className="mt-1 text-xs text-yellow-100/60">O comprovante já está disponível para impressão.</div>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/pdv/vendas/${lastSaleId}`} className="rounded-xl border border-yellow-300/20 px-4 py-2 text-xs font-black text-yellow-100">Detalhes</Link>
            <Link target="_blank" href={`/admin/pdv/vendas/${lastSaleId}/comprovante`} className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-slate-950">Abrir comprovante</Link>
          </div>
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(390px,.82fr)]">
        <section className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/45 shadow-2xl shadow-black/10">
          <div className="border-b border-white/10 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  ref={searchRef}
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') handleSearchEnter(); }}
                  placeholder="Produto, código ou código de barras…"
                  className="h-14 w-full rounded-2xl border border-white/10 bg-black/25 pl-12 pr-20 text-base font-bold text-white outline-none placeholder:text-slate-600 focus:border-yellow-400/60 focus:ring-4 focus:ring-yellow-400/10"
                />
                <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-slate-500 sm:block">F2</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Barcode size={20} className="text-yellow-300" />
                Leitor: escaneie e pressione Enter
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {(['available', 'low', 'all'] as StockFilter[]).map((filter) => (
                  <button key={filter} type="button" onClick={() => setStockFilter(filter)} className={`rounded-xl px-3 py-2 text-[11px] font-black ${stockFilter === filter ? 'bg-yellow-400 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                    {filter === 'available' ? 'Em estoque' : filter === 'low' ? 'Estoque baixo' : 'Todos'}
                  </button>
                ))}
              </div>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 min-w-44 rounded-xl border border-white/10 bg-slate-900 px-3 text-xs font-bold text-slate-200 outline-none focus:border-yellow-400/50">
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500">{filteredProducts.length} produtos exibidos</span>
              <span className="text-[10px] text-slate-600">máximo de 80 por busca</span>
            </div>
            {filteredProducts.length ? (
              <div className="grid max-h-[680px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredProducts.map((product) => {
                  const stock = stockById[product.id] ?? product.quantity;
                  const inCart = cart.find((item) => item.product.id === product.id)?.quantity ?? 0;
                  const low = stock > 0 && stock <= product.minQuantity;
                  return (
                    <button key={product.id} type="button" disabled={stock <= 0} onClick={() => addProduct(product)} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:-translate-y-0.5 hover:border-yellow-400/30 hover:bg-white/[0.065] disabled:cursor-not-allowed disabled:opacity-45">
                      <div className="h-14 w-14 flex-none overflow-hidden rounded-xl border border-white/10"><ProductMedia product={product} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-black leading-tight text-slate-100">{product.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
                          <span>{product.sheet_code || 'Sem código'}</span>
                          <span className={low ? 'font-bold text-amber-300' : stock <= 0 ? 'font-bold text-red-300' : ''}>Estoque {stock}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="font-black text-yellow-300">{money(product.price)}</span>
                          {inCart > 0 && <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[9px] font-black text-slate-950">{inCart} no carrinho</span>}
                        </div>
                      </div>
                      <Plus size={18} className="flex-none text-slate-600 group-hover:text-yellow-300" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
                <Search size={30} className="text-slate-700" />
                <div className="mt-3 font-bold text-slate-300">Nenhum produto encontrado</div>
                <div className="mt-1 text-xs text-slate-600">Revise a busca, categoria ou filtro de estoque.</div>
              </div>
            )}
          </div>
        </section>

        <aside className="min-w-0 rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-black/20 xl:sticky xl:top-4">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-yellow-400 text-slate-950"><ShoppingCart size={20} /></span>
              <div>
                <div className="font-black text-white">Venda atual</div>
                <div className="text-xs text-slate-500">{totals.itemCount} {totals.itemCount === 1 ? 'item' : 'itens'}</div>
              </div>
            </div>
            <div className="relative flex gap-1">
              <button type="button" onClick={holdCurrentSale} title="Colocar em espera" className="rounded-xl border border-white/10 p-2.5 text-slate-300 hover:bg-white/5 hover:text-yellow-200"><Pause size={17} /></button>
              <button type="button" onClick={() => setHeldOpen((open) => !open)} title="Vendas em espera" className="relative rounded-xl border border-white/10 p-2.5 text-slate-300 hover:bg-white/5 hover:text-yellow-200">
                <History size={17} />
                {heldSales.length > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-yellow-400 px-1 text-[9px] font-black text-slate-950">{heldSales.length}</span>}
              </button>
              <button type="button" onClick={() => clearSale()} title="Limpar venda" className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-200"><Trash2 size={17} /></button>

              {heldOpen && (
                <div className="absolute right-0 top-12 z-30 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-slate-950 p-2 shadow-2xl">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="text-xs font-black text-white">Vendas em espera</div>
                    <button type="button" onClick={() => setHeldOpen(false)}><X size={15} /></button>
                  </div>
                  {!heldSales.length ? <div className="px-3 py-6 text-center text-xs text-slate-500">Nenhuma venda em espera.</div> : heldSales.map((hold) => (
                    <div key={hold.id} className="mb-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
                      <button type="button" onClick={() => restoreHeldSale(hold)} className="min-w-0 flex-1 p-1 text-left">
                        <div className="truncate text-xs font-black text-slate-100">{hold.label}</div>
                        <div className="mt-1 text-[10px] text-slate-500">{hold.items.length} produtos · {new Date(hold.createdAt).toLocaleString('pt-BR')}</div>
                      </button>
                      <button type="button" onClick={() => setHeldSales((items) => items.filter((item) => item.id !== hold.id))} className="rounded-lg p-2 text-slate-500 hover:bg-red-400/10 hover:text-red-200"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto border-b border-white/10 p-3 sm:p-4">
            {!cart.length ? (
              <div className="flex min-h-40 flex-col items-center justify-center text-center">
                <ShoppingCart size={30} className="text-slate-700" />
                <div className="mt-3 text-sm font-bold text-slate-400">Carrinho vazio</div>
                <div className="mt-1 max-w-56 text-xs text-slate-600">Busque ou escaneie um produto para começar.</div>
              </div>
            ) : (
              <div className="grid gap-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 flex-none overflow-hidden rounded-xl border border-white/10"><ProductMedia product={item.product} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-xs font-black text-slate-100">{item.product.name}</div>
                        <div className="mt-1 text-[10px] text-slate-500">{money(item.product.price)} · estoque {stockById[item.product.id] ?? 0}</div>
                      </div>
                      <button type="button" onClick={() => setCart((items) => items.filter((current) => current.product.id !== item.product.id))} className="rounded-lg p-1.5 text-slate-600 hover:bg-red-400/10 hover:text-red-200"><X size={15} /></button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                      <div className="flex items-center rounded-xl border border-white/10 bg-black/20 p-1">
                        <button type="button" onClick={() => changeQuantity(item.product.id, -1)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10"><Minus size={14} /></button>
                        <span className="w-9 text-center text-sm font-black text-white">{item.quantity}</span>
                        <button type="button" onClick={() => changeQuantity(item.product.id, 1)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10"><Plus size={14} /></button>
                      </div>
                      <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        Desc. R$
                        <input value={item.discount ? String(item.discount).replace('.', ',') : ''} onChange={(event) => setItemDiscount(item.product.id, event.target.value)} inputMode="decimal" placeholder="0,00" className="h-9 w-20 rounded-lg border border-white/10 bg-black/20 px-2 text-right text-xs font-bold text-white outline-none focus:border-yellow-400/50" />
                      </label>
                      <div className="text-sm font-black text-yellow-300">{money(Math.max(0, item.product.price * item.quantity - item.discount))}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 p-4 sm:p-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500"><UserRound size={14} /> Cliente</label>
                {(customerName || customerPhone) && <button type="button" onClick={() => { setCustomerName(''); setCustomerPhone(''); setCustomerQuery(''); }} className="text-[10px] font-bold text-slate-500 hover:text-white">Consumidor balcão</button>}
              </div>
              <div className="relative">
                <input value={customerQuery} onFocus={() => setCustomerOpen(true)} onBlur={() => setTimeout(() => setCustomerOpen(false), 150)} onChange={(event) => { setCustomerQuery(event.target.value); setCustomerOpen(true); }} placeholder="Buscar cliente por nome ou telefone" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-yellow-400/50" />
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-3.5 text-slate-600" />
                {customerOpen && filteredCustomers.length > 0 && (
                  <div className="absolute z-20 mt-2 max-h-52 w-full overflow-y-auto rounded-xl border border-white/10 bg-slate-950 p-1 shadow-2xl">
                    {filteredCustomers.map((customer) => (
                      <button key={customer.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setCustomerName(customer.name); setCustomerPhone(digits(customer.phone || '')); setCustomerQuery(customer.name); setCustomerOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/5">
                        <div className="text-xs font-black text-slate-100">{customer.name}</div>
                        <div className="text-[10px] text-slate-500">{customer.phone || 'Sem telefone'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nome" className="h-10 min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 text-xs text-white outline-none focus:border-yellow-400/50" />
                <input value={customerPhone} onChange={(event) => setCustomerPhone(digits(event.target.value))} inputMode="tel" placeholder="WhatsApp" className="h-10 min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 text-xs text-white outline-none focus:border-yellow-400/50" />
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500"><CircleDollarSign size={14} /> Desconto geral</label>
              <div className="flex gap-2">
                <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
                  {(['value', 'percent'] as const).map((mode) => <button key={mode} type="button" onClick={() => { const value = parseMoney(discountInput); setOrderDiscount({ mode, value }); }} className={`rounded-lg px-3 text-xs font-black ${orderDiscount.mode === mode ? 'bg-yellow-400 text-slate-950' : 'text-slate-500'}`}>{mode === 'value' ? 'R$' : '%'}</button>)}
                </div>
                <input value={discountInput} onChange={(event) => { setDiscountInput(event.target.value); setOrderDiscount({ ...orderDiscount, value: parseMoney(event.target.value) }); }} inputMode="decimal" placeholder="0,00" className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-right text-sm font-black text-white outline-none focus:border-yellow-400/50" />
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500"><CreditCard size={14} /> Pagamento</label>
              <div className="grid grid-cols-3 gap-2">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  return <button key={option.id} type="button" onClick={() => setPayment(option.id)} className={`rounded-xl border p-3 text-left transition ${payment === option.id ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-100' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'}`}><Icon size={18} /><div className="mt-2 text-xs font-black">{option.label}</div><div className="mt-0.5 hidden text-[9px] opacity-60 sm:block">{option.detail}</div></button>;
                })}
              </div>
            </div>

            {payment === 'dinheiro' && (
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.055] p-3">
                <label className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/60">Valor recebido</label>
                <input value={cashReceived} onChange={(event) => setCashReceived(event.target.value)} inputMode="decimal" placeholder={money(totals.total)} className="mt-2 h-11 w-full rounded-xl border border-emerald-400/20 bg-black/20 px-3 text-right text-lg font-black text-white outline-none focus:border-emerald-300/50" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[totals.total, 50, 100, 200].filter((value, index, all) => value > 0 && all.indexOf(value) === index).map((value) => <button key={value} type="button" onClick={() => setCashReceived(value.toFixed(2).replace('.', ','))} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-black text-slate-300 hover:bg-white/10">{money(value)}</button>)}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm"><span className="text-emerald-100/60">Troco</span><span className="font-black text-emerald-200">{money(change)}</span></div>
              </div>
            )}

            {payment === 'fiado' && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-amber-400/15 bg-amber-400/[0.055] p-3">
                <label className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-200/60">Entrada
                  <input value={paidNow} onChange={(event) => setPaidNow(event.target.value)} inputMode="decimal" placeholder="0,00" className="mt-2 h-10 w-full rounded-xl border border-amber-400/20 bg-black/20 px-3 text-right text-xs font-black text-white outline-none" />
                </label>
                <label className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-200/60">Vencimento
                  <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-amber-400/20 bg-black/20 px-2 text-xs font-black text-white outline-none [color-scheme:dark]" />
                </label>
                <div className="col-span-2 flex items-center gap-2 text-[10px] text-amber-100/60"><Clock3 size={13} /> Cliente com telefone é obrigatório.</div>
              </div>
            )}

            <div className="grid gap-1.5 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
              {totals.itemDiscount > 0 && <div className="flex justify-between text-emerald-300/80"><span>Descontos nos itens</span><span>− {money(totals.itemDiscount)}</span></div>}
              {totals.orderDiscount > 0 && <div className="flex justify-between text-emerald-300/80"><span>Desconto geral</span><span>− {money(totals.orderDiscount)}</span></div>}
              <div className="my-2 h-px bg-white/10" />
              <div className="flex items-end justify-between gap-4"><span className="font-black uppercase tracking-wide text-slate-300">Total</span><span className="text-2xl font-black text-yellow-300">{money(totals.total)}</span></div>
            </div>

            <button type="button" onClick={finishSale} disabled={saving || !cart.length} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-yellow-400 text-sm font-black text-slate-950 shadow-lg shadow-yellow-400/10 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
              {saving ? <><RotateCcw size={19} className="animate-spin" /> Processando venda…</> : <><ReceiptText size={20} /> Concluir venda</>}
            </button>
            <div className="flex items-center justify-center gap-4 text-[9px] font-bold uppercase tracking-wide text-slate-600"><span>F2 buscar</span><span>Esc limpar busca</span><span>Estoque transacional</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
