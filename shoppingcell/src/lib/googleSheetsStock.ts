import { getGoogleSheetsClient } from '@/lib/googleAuth';

function colToA1(colIndex0: number) {
  // 0 -> A
  let n = colIndex0 + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export type SheetStockRow = {
  rowIndex: number; // 1-based (A1)
  code: string;
  stock: number;
};

export async function fetchSheetStockIndex(params?: { spreadsheetId?: string; sheetName?: string }) {
  const spreadsheetId =
    params?.spreadsheetId || process.env.GOOGLE_SHEETS_ID || '16Kz_lWC2JlyG6kiv7qVr8fpBKyXbwKbxrQCjH7OVTIs';
  const sheetName = params?.sheetName || process.env.GOOGLE_SHEETS_TAB || 'Estoque';

  const sheets = getGoogleSheetsClient();

  // Read a broad range (keeps things simple). If it grows, we can optimize.
  const range = `'${sheetName}'!A:Z`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = (res.data.values || []) as string[][];
  if (values.length < 2) return { spreadsheetId, sheetName, header: [], byCode: new Map<string, SheetStockRow>() };

  const header = (values[0] || []).map((x) => String(x || '').trim());
  const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const iCodigo = idx('Código');
  const iEstoque = idx('Estoque');
  if (iCodigo === -1 || iEstoque === -1) {
    throw new Error(`Missing columns in sheet. Need "Código" and "Estoque". Found: ${header.join(', ')}`);
  }

  const byCode = new Map<string, SheetStockRow>();
  for (let i = 1; i < values.length; i++) {
    const row = values[i] || [];
    const code = String(row[iCodigo] || '').trim();
    if (!code) continue;
    const stockRaw = String(row[iEstoque] || '').trim();
    const stock = Number(stockRaw.replace(/[^0-9\-]/g, ''));
    byCode.set(code, { rowIndex: i + 1, code, stock: Number.isFinite(stock) ? stock : 0 });
  }

  return { spreadsheetId, sheetName, header, iCodigo, iEstoque, byCode };
}

export async function writeBackStockByCode(
  items: Array<{ code: string; stock: number }>,
  params?: { spreadsheetId?: string; sheetName?: string },
) {
  if (!items.length) return { ok: true, updated: 0 };

  const { spreadsheetId, sheetName, iEstoque, byCode } = await fetchSheetStockIndex(params);
  if (iEstoque == null) throw new Error('Sheet index missing iEstoque');
  const sheets = getGoogleSheetsClient();

  const data: { range: string; values: any[][] }[] = [];
  for (const it of items) {
    const code = (it.code || '').trim();
    if (!code) continue;
    const row = byCode.get(code);
    if (!row) continue; // code not found in sheet

    const colA1 = colToA1(iEstoque);
    const range = `'${sheetName}'!${colA1}${row.rowIndex}`;
    data.push({ range, values: [[Number(it.stock)]] });
  }

  if (!data.length) return { ok: true, updated: 0 };

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data,
    },
  });

  return { ok: true, updated: data.length };
}
