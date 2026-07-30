import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type QuoteItem = { name: string; code?: string | null; qty?: number | null; url?: string | null };

function directWhatsAppQuote(items: QuoteItem[], notes?: string | null) {
  const phone = (process.env.NEXT_PUBLIC_WHATSAPP_E164 || '').replace(/\D/g, '');
  if (!phone) return null;

  const lines = ['Olá! Vim pelo site da Shopping Cell e gostaria de solicitar uma cotação:', ''];
  for (const item of items.slice(0, 50)) {
    const qty = Math.max(1, Math.min(9999, Number(item.qty || 1)));
    const code = item.code ? ` (cód. ${String(item.code).slice(0, 80)})` : '';
    lines.push(`• ${qty}x ${String(item.name || 'Produto').slice(0, 160)}${code}`);
    if (item.url) lines.push(`  ${String(item.url).slice(0, 500)}`);
  }
  if (notes) lines.push('', `Observações: ${String(notes).slice(0, 1000)}`);
  lines.push('', 'Aguardo a confirmação de disponibilidade e condições.');

  const text = lines.join('\n');
  return { waLink: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`, text };
}

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
    const items = Array.isArray(body.items) ? body.items.filter((item) => item?.name) : [];
    if (!items.length) return NextResponse.json({ ok: false, error: 'missing_items' }, { status: 400 });

    const fallback = () => {
      const direct = directWhatsAppQuote(items, body.notes);
      return direct
        ? NextResponse.json({ ok: true, ...direct, fallback: true })
        : NextResponse.json({ ok: false, error: 'missing_whatsapp_configuration' }, { status: 500 });
    };

    const webhookUrl = process.env.N8N_SITE_WEBHOOK_URL;
    if (!webhookUrl) return fallback();

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items, notes: body.notes || null }),
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      });
      const text = await response.text();
      const json = (() => { try { return JSON.parse(text); } catch { return null; } })();
      if (!response.ok || !json?.waLink) return fallback();
      return NextResponse.json({ ok: true, waLink: json.waLink, text: json.text ?? null, fallback: false });
    } catch {
      return fallback();
    }
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}
