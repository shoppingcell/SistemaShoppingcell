import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminOrActiveStaff } from '@/lib/requireAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

type ProductPatch = {
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  cost_price: number | null;
  active: boolean;
  category_id: string | null;
  subcategory_id: string | null;
  featured: boolean;
};

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminOrActiveStaff();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { id } = await context.params;
  const body = (await req.json().catch(() => null)) as Partial<ProductPatch> | null;
  if (!body || typeof body.name !== 'string' || typeof body.slug !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid_product_payload' }, { status: 400 });
  }

  const payload: ProductPatch & { price_locked: boolean; cost_locked: boolean } = {
    name: body.name.trim(),
    slug: body.slug.trim(),
    description: typeof body.description === 'string' && body.description.trim() ? body.description : null,
    price: typeof body.price === 'number' && Number.isFinite(body.price) ? body.price : null,
    cost_price: typeof body.cost_price === 'number' && Number.isFinite(body.cost_price) ? body.cost_price : null,
    price_locked: true,
    cost_locked: true,
    active: Boolean(body.active),
    category_id: typeof body.category_id === 'string' && body.category_id ? body.category_id : null,
    subcategory_id: typeof body.subcategory_id === 'string' && body.subcategory_id ? body.subcategory_id : null,
    featured: Boolean(body.featured),
  };

  if (!payload.name || !payload.slug) {
    return NextResponse.json({ ok: false, error: 'name_and_slug_required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select('id,name,slug,description,price,cost_price,active,category_id,subcategory_id,featured')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  // Confirm the exact value returned by Postgres before reporting success.
  if (Boolean(data.featured) !== payload.featured) {
    return NextResponse.json({ ok: false, error: 'featured_persistence_mismatch' }, { status: 409 });
  }

  revalidatePath('/');
  revalidatePath('/catalogo');
  revalidatePath(`/produto/${data.slug}`);

  return NextResponse.json({ ok: true, product: data });
}

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminOrActiveStaff();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('products').select('slug').eq('id', id).single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  revalidatePath('/');
  revalidatePath('/catalogo');
  revalidatePath(`/produto/${data.slug}`);

  return NextResponse.json({ ok: true, slug: data.slug });
}
