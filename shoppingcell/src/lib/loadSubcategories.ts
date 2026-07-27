import { supabaseBrowser } from './supabaseBrowser';

export async function loadSubcategories(categoryId: string) {
  if (!categoryId) return [];
  const { data, error } = await supabaseBrowser
    .from('subcategories')
    .select('id, name, category_id')
    .eq('category_id', categoryId)
    .order('name', { ascending: true });

  if (error) return [];
  return data ?? [];
}
