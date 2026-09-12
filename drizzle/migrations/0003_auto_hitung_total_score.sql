CREATE OR REPLACE FUNCTION public.recalc_total_score(_registration_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  skor numeric;
BEGIN
  SELECT ROUND(COALESCE(SUM((rs.value / NULLIF(c.max_value, 0)) * c.weight), 0)::numeric, 3)
  INTO skor
  FROM public.registration_scores rs
  JOIN public.criteria c ON c.id = rs.criteria_id AND c.active
  WHERE rs.registration_id = _registration_id;

  UPDATE public.registrations
  SET total_score = skor
  WHERE id = _registration_id
    AND status <> 'draft';
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_total_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_total_score(OLD.registration_id);
    RETURN OLD;
  END IF;

  PERFORM public.recalc_total_score(NEW.registration_id);
  IF TG_OP = 'UPDATE' AND NEW.registration_id <> OLD.registration_id THEN
    PERFORM public.recalc_total_score(OLD.registration_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scores_recalc_total ON public.registration_scores;
CREATE TRIGGER trg_scores_recalc_total
AFTER INSERT OR UPDATE OR DELETE ON public.registration_scores
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_total_score();

CREATE OR REPLACE FUNCTION public.trg_recalc_scores_criteria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT registration_id FROM public.registration_scores
    WHERE criteria_id = COALESCE(NEW.id, OLD.id)
  LOOP
    PERFORM public.recalc_total_score(r.registration_id);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_criteria_recalc_total ON public.criteria;
CREATE TRIGGER trg_criteria_recalc_total
AFTER UPDATE OF weight, max_value, active ON public.criteria
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_scores_criteria();

REVOKE EXECUTE ON FUNCTION public.recalc_total_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_total_score() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_scores_criteria() FROM PUBLIC, anon, authenticated;