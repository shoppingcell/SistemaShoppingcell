import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createSupabaseServiceClient } from '@/lib/supabaseService';
import { parseCsv } from '@/lib/csv';
import { slugify } from '@/lib/slugify';

function parseBRL(v: string): number | null {
  const s = (v || '').toString().trim();
  if (!s) return null;
  const cleaned = s
    .replace(/R\$\s?/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.\-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseIntSafe(v: string): number {
  const n = Number((v || '').toString().trim().replace(/[^0-9\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST() {
  const supabaseAuth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const sheetCsvUrl =
    process.env.GOOGLE_SHEETS_CSV_URL ||
    'https://docs.google.com/spreadsheets/d/16Kz_lWC2JlyG6kiv7qVr8fpBKyXbwKbxrQCjH7OVTIs/gviz/tq?tqx=out:csv';

  const res = await fetch(sheetCsvUrl, { cache: 'no-store' });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: `failed_to_fetch_sheet:${res.status}` }, { status: 500 });
  }

  const csv = await res.text();
  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return NextResponse.json({ ok: false, error: 'empty_sheet' }, { status: 400 });
  }

  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const iCodigo = idx('Código');
  const iDesc = idx('Descrição');
  const iCusto = idx('Preço de Custo');
  const iVenda = idx('Preço de Venda');
  const iEstoque = idx('Estoque');
  const iMin = idx('Estoque mínimo');
  const iCat = idx('Categoria');
  const iNcm = idx('NCM');
  const iCest = idx('CEST');
  const iBarcode = idx('Código de Barras');

  if (iCodigo === -1 || iDesc === -1 || iVenda === -1 || iEstoque === -1 || iCat === -1) {
    return NextResponse.json({ ok: false, error: 'missing_columns', header });
  }

  const service = createSupabaseServiceClient();

  // 1) Categories
  const catNames = new Set<string>();
  for (const r of rows.slice(1)) {
    const name = (r[iCat] || '').trim();
    if (name) catNames.add(name);
  }

  const categoriesPayload = Array.from(catNames).map((name) => ({ name, slug: slugify(name) }));

  if (categoriesPayload.length) {
    const { error } = await service.from('categories').upsert(categoriesPayload, { onConflict: 'slug' });
    if (error) return NextResponse.json({ ok: false, step: 'upsert_categories', error: error.message }, { status: 500 });
  }

  const { data: categories, error: catErr } = await service.from('categories').select('id,slug');
  if (catErr) return NextResponse.json({ ok: false, step: 'read_categories', error: catErr.message }, { status: 500 });
  const catIdBySlug = new Map((categories ?? []).map((c) => [c.slug, c.id]));

  // Build desired rows from sheet
  const sheetProducts = rows.slice(1).map((r) => {
    const code = (r[iCodigo] || '').trim();
    const desc = (r[iDesc] || '').trim();
    const cat = (r[iCat] || '').trim();

    const slugBase = slugify(desc || code || 'produto');
    const slug = code ? `${slugBase}-${slugify(code)}` : slugBase;

    return {
      code,
      name: desc || `Produto ${code}`,
      slug,
      category_id: cat ? catIdBySlug.get(slugify(cat)) ?? null : null,
      price: parseBRL(r[iVenda]),
      cost_price: iCusto !== -1 ? parseBRL(r[iCusto]) : null,
      quantity: parseIntSafe(r[iEstoque]),
      min_quantity: iMin !== -1 ? parseIntSafe(r[iMin]) : 0,
      ncm: iNcm !== -1 ? (r[iNcm] || '').trim() : null,
      cest: iCest !== -1 ? (r[iCest] || '').trim() : null,
      barcode: iBarcode !== -1 ? (r[iBarcode] || '').trim() : null,
    };
  });

  // 2) Products: read existing locks
  const slugs = sheetProducts.map((p) => p.slug);
  const { data: existingProducts, error: exErr } = await service
    .from('products')
    .select('id,slug,price_locked,cost_locked')
    .in('slug', slugs);

  if (exErr) return NextResponse.json({ ok: false, step: 'read_existing_products', error: exErr.message }, { status: 500 });

  const existingBySlug = new Map((existingProducts ?? []).map((p) => [p.slug, p]));

  const inserts = sheetProducts
    .filter((p) => !existingBySlug.has(p.slug))
    .map((p) => ({
      name: p.name,
      slug: p.slug,
      description: null,
      active: true,
      category_id: p.category_id,
      price: p.price,
      cost_price: p.cost_price,
      sheet_code: p.code || null,
      ncm: p.ncm,
      cest: p.cest,
      barcode: p.barcode,
      price_locked: false,
      cost_locked: false,
    }));

  if (inserts.length) {
    const { error } = await service.from('products').insert(inserts);
    if (error) return NextResponse.json({ ok: false, step: 'insert_products', error: error.message }, { status: 500 });
  }

  // Updates in batches (respect locks)
  const updates = sheetProducts
    .filter((p) => existingBySlug.has(p.slug))
    .map((p) => {
      const ex = existingBySlug.get(p.slug)! as any;
      const patch: any = {
        name: p.name,
        category_id: p.category_id,
        sheet_code: p.code || null,
        ncm: p.ncm,
        cest: p.cest,
        barcode: p.barcode,
      };
      if (!ex.price_locked) patch.price = p.price;
      if (!ex.cost_locked) patch.cost_price = p.cost_price;
      return { id: ex.id, patch };
    });

  for (const batch of chunk(updates, 50)) {
    const results = await Promise.all(
      batch.map((u) => service.from('products').update(u.patch).eq('id', u.id))
    );
    const firstErr = results.find((r) => r.error)?.error;
    if (firstErr) return NextResponse.json({ ok: false, step: 'update_products', error: firstErr.message }, { status: 500 });
  }

  // 3) Inventory: map product ids
  const { data: products, error: prodReadErr } = await service.from('products').select('id,slug');
  if (prodReadErr) return NextResponse.json({ ok: false, step: 'read_products', error: prodReadErr.message }, { status: 500 });
  const productIdBySlug = new Map((products ?? []).map((p) => [p.slug, p.id]));

  const invProductIds = sheetProducts
    .map((p) => productIdBySlug.get(p.slug))
    .filter(Boolean) as string[];

  const { data: existingInv, error: invReadErr } = await service
    .from('inventory')
    .select('product_id,quantity_locked,min_locked')
    .in('product_id', invProductIds);

  if (invReadErr) return NextResponse.json({ ok: false, step: 'read_inventory', error: invReadErr.message }, { status: 500 });

  const invLocksByProductId = new Map((existingInv ?? []).map((r) => [r.product_id, r]));

  const invUpserts: any[] = [];
  for (const p of sheetProducts) {
    const product_id = productIdBySlug.get(p.slug);
    if (!product_id) continue;

    const locks = invLocksByProductId.get(product_id) as any;

    // if inventory row doesn't exist yet, create it with sheet values
    if (!locks) {
      invUpserts.push({
        product_id,
        quantity: p.quantity,
        min_quantity: p.min_quantity,
        updated_at: new Date().toISOString(),
        quantity_locked: false,
        min_locked: false,
      });
      continue;
    }

    const patch: any = { product_id, updated_at: new Date().toISOString() };
    if (!locks.quantity_locked) patch.quantity = p.quantity;
    if (!locks.min_locked) patch.min_quantity = p.min_quantity;
    invUpserts.push(patch);
  }

  if (invUpserts.length) {
    const { error: invErr } = await service.from('inventory').upsert(invUpserts, { onConflict: 'product_id' });
    if (invErr) return NextResponse.json({ ok: false, step: 'upsert_inventory', error: invErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    synced: {
      categories: categoriesPayload.length,
      products: sheetProducts.length,
      inventory: invUpserts.length,
    },
    notes: {
      sheetCsvUrl,
      hasCostColumn: iCusto !== -1,
      hasMinStockColumn: iMin !== -1,
      mode: 'admin_can_override_auto_lock',
    },
  });
}
