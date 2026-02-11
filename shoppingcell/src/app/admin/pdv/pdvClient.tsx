'use client';

import { useMemo, useState } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { Panel } from '@/app/admin/_components/ui/Panel';
import { Input } from '@/app/admin/_components/ui/Input';
import { Button } from '@/app/admin/_components/ui/Button';

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  sheet_code?: string | null;
  barcode?: string | null;
  active: boolean;
  quantity: number;
};

type CartItem = {
  product: ProductRow;
  quantity: number;
  unit_price: number;
  discount: number;
};

function money(n: number) {
  return `R$ ${n.toFixed(2)}`;
}

export function PdvClient({ products }: { products: ProductRow[] }) {
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [payment, setPayment] = useState<'pix' | 'dinheiro' | 'fiado'>('pix');
  const [discountTotal, setDiscountTotal] = useState('0');

  const [cashReceived, setCashReceived] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products.slice(0, 50);
    return products
      .filter((p) => {
        const code = String(p.sheet_code || '').toLowerCase();
        const bc = String(p.barcode || '').toLowerCase();
        return (
          p.name.toLowerCase().includes(term) ||
          p.slug.toLowerCase().includes(term) ||
          code.includes(term) ||
          bc.includes(term)
        );
      })
      .slice(0, 50);
  }, [products, q]);

  const subtotal = useMemo(() => cart.reduce((acc, it) => acc + it.unit_price * it.quantity, 0), [cart]);

  const itemsTotal = useMemo(
    () => cart.reduce((acc, it) => acc + Math.max(0, it.unit_price * it.quantity - it.discount), 0),
    [cart],
  );

  const discT = Number((discountTotal || '0').replace(',', '.')) || 0;
  const total = Math.max(0, itemsTotal - discT);

  const received =
    payment === 'dinheiro'
      ? cashReceived.trim()
        ? Number(cashReceived.replace(',', '.')) || 0
        : total
      : payment === 'pix'
        ? total
        : 0;

  const change = payment === 'dinheiro' ? Math.max(0, received - total) : 0;

  function add(p: ProductRow) {
    setError(null);
    setLastSaleId(null);

    setCart((old) => {
      const idx = old.findIndex((x) => x.product.id === p.id);
      if (idx >= 0) {
        const next = [...old];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...old,
        {
          product: p,
          quantity: 1,
          unit_price: Number(p.price ?? 0),
          discount: 0,
        },
      ];
    });
  }

  async function checkout() {
    setSaving(true);
    setError(null);
    setLastSaleId(null);

    try {
      if (cart.length === 0) throw new Error('Carrinho vazio.');
      if (payment === 'fiado') {
        if (!customerName.trim() && !customerPhone.trim()) {
          throw new Error('Fiado exige cliente (nome e/ou telefone).');
        }
      }

      const payloadItems = cart.map((it) => ({
        product_id: it.product.id,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount: it.discount,
      }));

      const customer =
        customerName.trim() || customerPhone.trim()
          ? { name: customerName.trim(), phone: customerPhone.trim() }
          : null;

      const { data, error } = await supabase.rpc('pdv_create_sale', {
        p_payment_method: payment,
        p_items: payloadItems,
        p_customer: customer,
        p_discount_total: discT,
        p_due_date: null,
        // For dinheiro: send received amount (server calculates change)
        p_paid_amount: payment === 'dinheiro' ? received : payment === 'fiado' ? 0 : total,
      } as any);

      if (error) throw error;

      setLastSaleId(String(data));
      setCart([]);
      setDiscountTotal('0');
      setCustomerName('');
      setCustomerPhone('');
      setCashReceived('');
      setQ('');
    } catch (e: any) {
      setError(e?.message || 'Falha ao finalizar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <div className="border-b border-white/10 px-6 py-5">
          <div className="text-sm font-semibold text-slate-200">Buscar produto</div>
          <div className="mt-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome / código / SKU / barcode"
            />
          </div>
          <div className="mt-2 text-xs text-slate-500">Mostrando até 50 resultados.</div>
        </div>

        <div className="max-h-[520px] overflow-auto p-4">
          <div className="grid gap-2">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p)}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-slate-100">{p.name}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {p.sheet_code ? `Código: ${p.sheet_code}` : '—'} • Estoque: {p.quantity}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-extrabold text-yellow-300">
                  {money(Number(p.price ?? 0))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="border-b border-white/10 px-6 py-5">
          <div className="text-sm font-semibold text-slate-200">Carrinho</div>
          <div className="mt-2 text-xs text-slate-500">
            Descontos por item e finalização PIX/Dinheiro/Fiado.
          </div>
        </div>

        <div className="p-6">
          {cart.length === 0 ? (
            <div className="text-sm text-slate-400">Adicione itens no carrinho.</div>
          ) : (
            <div className="grid gap-2">
              {cart.map((it) => (
                <div key={it.product.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-slate-100">{it.product.name}</div>
                      <div className="mt-1 text-xs text-slate-400">{money(it.unit_price)} / un</div>
                    </div>
                    <button
                      className="text-xs font-semibold text-red-200 hover:text-red-100"
                      onClick={() => setCart((old) => old.filter((x) => x.product.id !== it.product.id))}
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Qtd
                      </div>
                      <Input
                        value={String(it.quantity)}
                        onChange={(e) => {
                          const v = Math.max(1, Number(e.target.value || '1') || 1);
                          setCart((old) =>
                            old.map((x) => (x.product.id === it.product.id ? { ...x, quantity: v } : x)),
                          );
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Preço
                      </div>
                      <Input
                        value={String(it.unit_price)}
                        onChange={(e) => {
                          const v = Number(String(e.target.value).replace(',', '.')) || 0;
                          setCart((old) =>
                            old.map((x) => (x.product.id === it.product.id ? { ...x, unit_price: v } : x)),
                          );
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Desc (R$)
                      </div>
                      <Input
                        value={String(it.discount)}
                        onChange={(e) => {
                          const v = Number(String(e.target.value).replace(',', '.')) || 0;
                          setCart((old) =>
                            old.map((x) => (x.product.id === it.product.id ? { ...x, discount: v } : x)),
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span className="font-extrabold text-slate-100">{money(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total itens</span>
              <span className="font-extrabold text-slate-100">{money(itemsTotal)}</span>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Desconto total (R$)
              </div>
              <Input value={discountTotal} onChange={(e) => setDiscountTotal(e.target.value)} />
            </div>

            <div className="flex items-center justify-between text-base">
              <span className="text-slate-200">TOTAL</span>
              <span className="text-xl font-extrabold text-yellow-400">{money(total)}</span>
            </div>

            {payment === 'dinheiro' ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Recebido</span>
                <span className="font-extrabold text-slate-100">{money(received)}</span>
              </div>
            ) : null}

            {payment === 'dinheiro' ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Troco</span>
                <span className="font-extrabold text-slate-100">{money(change)}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`rounded-2xl border px-4 py-3 text-xs font-extrabold ${
                  payment === 'pix'
                    ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-200'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
                onClick={() => setPayment('pix')}
              >
                PIX
              </button>
              <button
                type="button"
                className={`rounded-2xl border px-4 py-3 text-xs font-extrabold ${
                  payment === 'dinheiro'
                    ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-200'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
                onClick={() => setPayment('dinheiro')}
              >
                Dinheiro
              </button>
              <button
                type="button"
                className={`rounded-2xl border px-4 py-3 text-xs font-extrabold ${
                  payment === 'fiado'
                    ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-200'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
                onClick={() => setPayment('fiado')}
              >
                Fiado
              </button>
            </div>

            {payment === 'dinheiro' && (
              <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-extrabold text-slate-100">Dinheiro</div>
                <Input
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={String(total)}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Troco</span>
                  <span className="font-extrabold text-slate-100">{money(change)}</span>
                </div>
                <div className="text-xs text-slate-400">Se não preencher, assume o valor total.</div>
              </div>
            )}

            {payment === 'fiado' && (
              <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-extrabold text-slate-100">Cliente (fiado)</div>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nome"
                />
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Telefone/WhatsApp"
                />
                <div className="text-xs text-slate-400">Fiado exige cliente.</div>
              </div>
            )}

            {error && <div className="text-sm text-red-200">{error}</div>}
            {lastSaleId && (
              <div className="text-sm text-green-200">
                Venda registrada. ID: {String(lastSaleId).slice(0, 8)}
              </div>
            )}

            <Button disabled={saving || cart.length === 0} onClick={checkout}>
              Finalizar venda
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
