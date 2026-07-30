import test from 'node:test';
import assert from 'node:assert/strict';

let pdv;
try {
  pdv = await import('../src/lib/pdvRules.ts');
} catch {
  pdv = null;
}

test('parseMoney aceita moeda brasileira e valores decimais', () => {
  assert.ok(pdv, 'módulo de regras do PDV ainda não implementado');
  assert.equal(pdv.parseMoney('R$ 1.234,56'), 1234.56);
  assert.equal(pdv.parseMoney('29,90'), 29.9);
  assert.equal(pdv.parseMoney('100.50'), 100.5);
  assert.equal(pdv.parseMoney(''), 0);
});

test('calculateSaleTotals combina descontos por item e percentual geral', () => {
  const totals = pdv.calculateSaleTotals(
    [
      { quantity: 2, unitPrice: 100, discount: 10 },
      { quantity: 1, unitPrice: 50, discount: 5 },
    ],
    { mode: 'percent', value: 10 },
  );
  assert.deepEqual(totals, {
    subtotal: 250,
    itemDiscount: 15,
    afterItemDiscount: 235,
    orderDiscount: 23.5,
    total: 211.5,
    itemCount: 3,
  });
});

test('nextCartQuantity limita a quantidade ao estoque disponível', () => {
  assert.deepEqual(pdv.nextCartQuantity(2, 2, 3), { quantity: 3, adjusted: true });
  assert.deepEqual(pdv.nextCartQuantity(1, -5, 3), { quantity: 1, adjusted: true });
  assert.deepEqual(pdv.nextCartQuantity(1, 1, 3), { quantity: 2, adjusted: false });
});

test('validateCheckout bloqueia dinheiro recebido abaixo do total', () => {
  const error = pdv.validateCheckout({
    items: [{ quantity: 1, stock: 5 }],
    payment: 'dinheiro',
    total: 100,
    cashReceived: 80,
    customerName: '',
    customerPhone: '',
    dueDate: '',
  });
  assert.equal(error, 'O valor recebido é menor que o total da venda.');
});

test('validateCheckout exige cliente identificado para fiado', () => {
  const error = pdv.validateCheckout({
    items: [{ quantity: 1, stock: 5 }],
    payment: 'fiado',
    total: 100,
    cashReceived: 0,
    customerName: '',
    customerPhone: '',
    dueDate: '2026-08-10',
  });
  assert.equal(error, 'Informe nome e telefone do cliente para vender fiado.');
});

test('validateCheckout exige vencimento para fiado', () => {
  const error = pdv.validateCheckout({
    items: [{ quantity: 1, stock: 5 }],
    payment: 'fiado',
    total: 100,
    cashReceived: 0,
    customerName: 'Cliente Teste',
    customerPhone: '5594999999999',
    dueDate: '',
  });
  assert.equal(error, 'Informe a data de vencimento do fiado.');
});

test('validateCheckout bloqueia carrinho vazio', () => {
  const error = pdv.validateCheckout({
    items: [], payment: 'pix', total: 0, cashReceived: 0,
    customerName: '', customerPhone: '', dueDate: '',
  });
  assert.equal(error, 'Adicione pelo menos um produto à venda.');
});

test('validateCheckout bloqueia quantidade acima do estoque', () => {
  const error = pdv.validateCheckout({
    items: [{ quantity: 4, stock: 3 }], payment: 'pix', total: 100, cashReceived: 0,
    customerName: '', customerPhone: '', dueDate: '',
  });
  assert.equal(error, 'Revise os itens: há quantidade maior que o estoque disponível.');
});

test('extractSaleId aceita retorno UUID legado e retorno estruturado', () => {
  const id = '123e4567-e89b-12d3-a456-426614174000';
  assert.equal(pdv.extractSaleId(id), id);
  assert.equal(pdv.extractSaleId({ sale_id: id }), id);
  assert.equal(pdv.extractSaleId(null), null);
});
