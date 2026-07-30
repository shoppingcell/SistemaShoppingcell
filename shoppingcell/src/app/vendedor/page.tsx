import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { VendedorPortalClient } from './VendedorPortalClient';

export const dynamic = 'force-dynamic';

export default async function VendedorPortalPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: products }, { data: customers }] = await Promise.all([
    supabase
      .from('products')
      .select('id,name,price,sheet_code')
      .order('name', { ascending: true })
      .limit(300),
    supabase
      .from('customers')
      .select('id,name,phone')
      .order('name', { ascending: true })
      .limit(300),
  ]);

  return (
    <VendedorPortalClient
      initialProducts={(products as any) ?? []}
      initialCustomers={(customers as any) ?? []}
    />
  );
}
