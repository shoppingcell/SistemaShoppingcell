-- ======================================================================
-- CORREÇÃO: Remove a restrição de chave estrangeira sales_seller_id_fkey
-- Execute no Supabase SQL Editor para permitir vendas por vendedores PIN/App
-- ======================================================================

-- 1. Remove a trava que exigia que todo seller_id estivesse cadastrado na tabela auth.users do Supabase
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_seller_id_fkey;

-- 2. Torna a coluna seller_id opcional/flexível
ALTER TABLE public.sales ALTER COLUMN seller_id DROP NOT NULL;

-- 3. Garante permissão de inserção na tabela sales para anon e authenticated
GRANT ALL ON public.sales TO anon, authenticated, service_role;
GRANT ALL ON public.sale_items TO anon, authenticated, service_role;

-- 4. Garante políticas RLS abertas para registro de vendas do PDV Móvel
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales') THEN
    DROP POLICY IF EXISTS sales_insert ON public.sales;
    CREATE POLICY sales_insert ON public.sales FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS sales_select ON public.sales;
    CREATE POLICY sales_select ON public.sales FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sale_items') THEN
    DROP POLICY IF EXISTS sale_items_insert ON public.sale_items;
    CREATE POLICY sale_items_insert ON public.sale_items FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS sale_items_select ON public.sale_items;
    CREATE POLICY sale_items_select ON public.sale_items FOR SELECT USING (true);
  END IF;
END $$;

SELECT 'Chave estrangeira sales_seller_id_fkey removida com sucesso!' AS resultado;
