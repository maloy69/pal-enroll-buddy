CREATE OR REPLACE FUNCTION public.auto_submit_on_documents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE lengkap integer; st reg_status;
BEGIN
  SELECT status INTO st FROM public.registrations WHERE id = NEW.registration_id;
  IF st IS DISTINCT FROM 'draft' THEN RETURN NEW; END IF;

  SELECT count(DISTINCT doc_type) INTO lengkap
  FROM public.documents
  WHERE registration_id = NEW.registration_id
    AND doc_type IN ('kk','akta','rapor','foto');

  IF lengkap >= 4 THEN
    UPDATE public.registrations
      SET status = 'submitted', submitted_at = COALESCE(submitted_at, now())
      WHERE id = NEW.registration_id AND status = 'draft';

    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, detail)
    VALUES (NEW.user_id, 'kirim_otomatis_berkas_lengkap', 'registrations', NEW.registration_id,
            jsonb_build_object('pemicu', 'dokumen wajib lengkap'));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_submit ON public.documents;
CREATE TRIGGER trg_auto_submit
AFTER INSERT OR UPDATE OF file_path ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.auto_submit_on_documents();