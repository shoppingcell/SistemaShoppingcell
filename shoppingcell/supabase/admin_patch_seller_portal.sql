-- =======================================================
-- ADMIN PATCH: SELLER PORTAL, PIN ACCESS & CASH REGISTER
-- =======================================================

-- 1. Add pin_code to staff_profiles & hr_employees if not present
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

-- 2. Create cash_registers table (Fechamento de Caixa)
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id text NOT NULL,
  seller_name text,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  initial_amount numeric(12,2) NOT NULL DEFAULT 0.00,
  final_cash numeric(12,2) DEFAULT 0.00,
  final_pix numeric(12,2) DEFAULT 0.00,
  final_card numeric(12,2) DEFAULT 0.00,
  expected_cash numeric(12,2) DEFAULT 0.00,
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

-- 3. Create cash_movements table (Sangrias e Suprimentos)
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id uuid REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  seller_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('sangria', 'suprimento')),
  amount numeric(12,2) NOT NULL DEFAULT 0.00,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS and grants
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select cash_registers" ON public.cash_registers FOR SELECT USING (true);
CREATE POLICY "Allow public insert cash_registers" ON public.cash_registers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update cash_registers" ON public.cash_registers FOR UPDATE USING (true);

CREATE POLICY "Allow public select cash_movements" ON public.cash_movements FOR SELECT USING (true);
CREATE POLICY "Allow public insert cash_movements" ON public.cash_movements FOR INSERT WITH CHECK (true);

GRANT ALL ON public.cash_registers TO anon, authenticated, service_role;
GRANT ALL ON public.cash_movements TO anon, authenticated, service_role;
