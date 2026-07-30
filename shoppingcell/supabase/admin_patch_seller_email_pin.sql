-- ============================================================
-- PATCH: Adiciona suporte a Email + PIN para vendedores
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Adiciona coluna 'email' na staff_profiles (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.staff_profiles ADD COLUMN email text;
  END IF;
END $$;

-- 2. Adiciona coluna 'display_name' na staff_profiles (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.staff_profiles ADD COLUMN display_name text;
  END IF;
END $$;

-- 3. Adiciona coluna 'email' na hr_employees (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hr_employees' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.hr_employees ADD COLUMN email text;
  END IF;
END $$;

-- 4. Adiciona coluna 'email' e 'display_name' na admin_users (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.admin_users ADD COLUMN email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.admin_users ADD COLUMN display_name text;
  END IF;
END $$;

-- 5. Garante pin_code em todas as tabelas (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_profiles' AND column_name = 'pin_code'
  ) THEN
    ALTER TABLE public.staff_profiles ADD COLUMN pin_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hr_employees' AND column_name = 'pin_code'
  ) THEN
    ALTER TABLE public.hr_employees ADD COLUMN pin_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'pin_code'
  ) THEN
    ALTER TABLE public.admin_users ADD COLUMN pin_code text;
  END IF;
END $$;

-- 6. Garante coluna 'active' em staff_profiles (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_profiles' AND column_name = 'active'
  ) THEN
    ALTER TABLE public.staff_profiles ADD COLUMN active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Fim do patch
SELECT 'Patch aplicado com sucesso!' AS resultado;
