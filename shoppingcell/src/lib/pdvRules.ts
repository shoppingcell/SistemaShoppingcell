export function parseMoney(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? '').trim().replace(/R\$\s?/gi, '').replace(/\s/g, '');
  if (!raw) return 0;

  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export type SaleLine = { quantity: number; unitPrice: number; discount?: number };
export type OrderDiscount = { mode: 'value' | 'percent'; value: number };

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function extractSaleId(data: unknown): string | null {
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object' && 'sale_id' in data) {
    const id = (data as { sale_id?: unknown }).sale_id;
    return typeof id === 'string' && id.trim() ? id : null;
  }
  return null;
}

export function nextCartQuantity(current: number, delta: number, stock: number) {
  const safeStock = Math.max(0, Math.floor(stock));
  const requested = Math.max(1, Math.floor(current + delta));
  const quantity = Math.min(Math.max(1, safeStock || 1), requested);
  return { quantity, adjusted: quantity !== current + delta };
}

export type CheckoutInput = {
  items: Array<{ quantity: number; stock: number }>;
  payment: 'pix' | 'dinheiro' | 'fiado';
  total: number;
  cashReceived: number;
  customerName: string;
  customerPhone: string;
  dueDate: string;
};

export function validateCheckout(input: CheckoutInput): string | null {
  if (!input.items.length) return 'Adicione pelo menos um produto à venda.';
  if (input.items.some((item) => item.quantity < 1 || item.quantity > item.stock)) {
    return 'Revise os itens: há quantidade maior que o estoque disponível.';
  }
  if (input.payment === 'dinheiro' && input.cashReceived < input.total) {
    return 'O valor recebido é menor que o total da venda.';
  }
  if (input.payment === 'fiado' && (!input.customerName.trim() || !input.customerPhone.replace(/\D/g, ''))) {
    return 'Informe nome e telefone do cliente para vender fiado.';
  }
  if (input.payment === 'fiado' && !input.dueDate) {
    return 'Informe a data de vencimento do fiado.';
  }
  return null;
}

export function calculateSaleTotals(lines: SaleLine[], orderDiscount: OrderDiscount) {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + Math.max(0, line.unitPrice) * Math.max(0, line.quantity), 0));
  const itemDiscount = roundMoney(lines.reduce((sum, line) => {
    const gross = Math.max(0, line.unitPrice) * Math.max(0, line.quantity);
    return sum + Math.min(gross, Math.max(0, line.discount ?? 0));
  }, 0));
  const afterItemDiscount = roundMoney(Math.max(0, subtotal - itemDiscount));
  const requestedDiscount = orderDiscount.mode === 'percent'
    ? afterItemDiscount * Math.min(100, Math.max(0, orderDiscount.value)) / 100
    : Math.max(0, orderDiscount.value);
  const orderDiscountValue = roundMoney(Math.min(afterItemDiscount, requestedDiscount));

  return {
    subtotal,
    itemDiscount,
    afterItemDiscount,
    orderDiscount: orderDiscountValue,
    total: roundMoney(afterItemDiscount - orderDiscountValue),
    itemCount: lines.reduce((sum, line) => sum + Math.max(0, line.quantity), 0),
  };
}
