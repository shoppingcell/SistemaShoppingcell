import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type QuoteItem = {
  name: string;
  code?: string | null;
  qty?: number | null;
  url?: string | null;
};

export async function POST(req: Request) {
  const expected = process.env.WHATSAPP_QUOTE_TOKEN || '';
  if (expected) {
    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const key = (req.headers.get('x-api-key') || '').trim();
    if (bearer !== expected && key !== expected) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { items?: QuoteItem[]; notes?: string };
    const items = Array.isArray(body.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json({ ok: false, error: 'missing_items' }, { status: 400 });
    }

    const webhookUrl = process.env.N8N_SITE_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json({ ok: false, error: 'missing_N8N_SITE_WEBHOOK_URL' }, { status: 500 });
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items, notes: body.notes || null }),
      // no caching, this is transactional
      cache: 'no-store',
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // ignore
    }

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: 'n8n_failed', status: res.status, body: json || text },
        { status: 502 },
      );
    }

    if (!json?.waLink) {
      return NextResponse.json(
        { ok: false, error: 'n8n_missing_waLink', body: json || text },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, waLink: json.waLink, text: json.text ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
