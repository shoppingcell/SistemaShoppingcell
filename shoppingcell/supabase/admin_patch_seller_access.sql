-- ================================================================
-- PATCH: Tabela dedicada para acesso de vendedores (seller_access)
-- Execute este SQL no Supabase SQL Editor UMA ÚNICA VEZ
-- ================================================================

-- Cria a tabela seller_access com todos os campos necessários
CREATE TABLE IF NOT EXISTS public.seller_access (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  pin_code    text NOT NULL,
  role        text NOT NULL DEFAULT 'staff',
  active      boolean NOT NULL DEFAULT true,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_access_email_key UNIQUE (email)
);

-- Índice para busca por email (login)
CREATE INDEX IF NOT EXISTS idx_seller_access_email ON public.seller_access(email);

-- RLS permissivo para uso interno
ALTER TABLE public.seller_access ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='seller_access' AND policyname='seller_access_all'
  ) THEN
    CREATE POLICY seller_access_all ON public.seller_access
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Grant para o anon (necessário para login sem autenticação Supabase)
GRANT SELECT ON public.seller_access TO anon;
GRANT ALL ON public.seller_access TO authenticated, service_role;

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.seller_access_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seller_access_updated_at ON public.seller_access;
CREATE TRIGGER trg_seller_access_updated_at
  BEFORE UPDATE ON public.seller_access
  FOR EACH ROW EXECUTE FUNCTION public.seller_access_set_updated_at();

SELECT 'Tabela seller_access criada com sucesso!' AS resultado;
