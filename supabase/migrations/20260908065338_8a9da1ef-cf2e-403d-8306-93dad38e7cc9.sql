CREATE OR REPLACE FUNCTION public.claim_first_operator() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role IN ('admin','operator')) THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'operator') ON CONFLICT DO NOTHING;
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id)
  VALUES (uid, 'klaim_operator_pertama', 'user_roles', uid);
  RETURN true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.claim_first_operator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_operator() TO authenticated;