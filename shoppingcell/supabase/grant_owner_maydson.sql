-- ========================================================================
-- SCRIPT: Concede Permissão de PROPRIETÁRIO (Owner/Admin) para maydsonptk@adm.com
-- Execute no Supabase SQL Editor se quiser promover no banco manualmente
-- ========================================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Busca o ID do usuário no Auth Supabase pelo e-mail
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'maydsonptk@adm.com' LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Insere ou Atualiza em admin_users como OWNER
    INSERT INTO public.admin_users (user_id, role, email, display_name)
    VALUES (v_user_id, 'owner', 'maydsonptk@adm.com', 'maydsonptk')
    ON CONFLICT (user_id) DO UPDATE SET role = 'owner';

    -- Insere ou Atualiza em staff_profiles como ADMIN
    INSERT INTO public.staff_profiles (user_id, role, active, display_name, email)
    VALUES (v_user_id, 'admin', true, 'maydsonptk', 'maydsonptk@adm.com')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin', active = true;

    RAISE NOTICE 'Usuário maydsonptk@adm.com promovido a Proprietário (Owner/Admin) com sucesso!';
  ELSE
    RAISE NOTICE 'Atenção: O e-mail maydsonptk@adm.com ainda não foi criado na aba Auth do Supabase.';
  END IF;
END $$;
