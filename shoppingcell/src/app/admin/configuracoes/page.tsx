import { requireAdminOrActiveStaff } from '@/lib/requireAdmin';
import { createSupabaseServiceClient } from '@/lib/supabaseService';
import { ConfiguracoesClient } from './ConfiguracoesClient';

export const dynamic = 'force-dynamic';

const defaultSettings = {
  logo_url: '',
  logo_text: 'SHOPPING CELL',
  hero_title: 'Peças e Componentes Premium Apple',
  hero_subtitle: 'Distribuidora oficial para assistências técnicas, lojistas e especialistas.',
  hero_video_url: '/hero/higgsfield-phone-open.mp4',
  hero_cta_text: 'Ver Catálogo Completo',
  whatsapp_number: '5594992814167',
  n8n_webhook_orders: 'https://seu-n8n.com/webhook/shoppingcell-orders',
  n8n_webhook_stock: 'https://seu-n8n.com/webhook/shoppingcell-stock',
  n8n_api_key: 'sc_live_9f8a2b3c4d5e6f7a8b9c0d1e2f',
};

export default async function ConfiguracoesPage() {
  await requireAdminOrActiveStaff();

  const supabase = createSupabaseServiceClient();

  let settings = defaultSettings;

  try {
    const { data } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      settings = { ...defaultSettings, ...data };
    }
  } catch {
    // Fallback to default
  }

  return <ConfiguracoesClient initialSettings={settings} />;
}
