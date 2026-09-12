CREATE OR REPLACE FUNCTION public.validate_registration_placement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  major_quota integer;
  occupied integer;
BEGIN
  IF NEW.status NOT IN ('accepted'::public.reg_status, 'enrolled'::public.reg_status) THEN
    RETURN NEW;
  END IF;

  IF NEW.accepted_major_id IS NULL THEN
    RAISE EXCEPTION 'Pendaftar yang diterima wajib memiliki jurusan hasil seleksi';
  END IF;

  IF NEW.accepted_major_id IS DISTINCT FROM NEW.first_choice_id
     AND NEW.accepted_major_id IS DISTINCT FROM NEW.second_choice_id THEN
    RAISE EXCEPTION 'Jurusan hasil harus merupakan pilihan pertama atau kedua';
  END IF;

  SELECT quota INTO major_quota
  FROM public.majors
  WHERE id = NEW.accepted_major_id AND active;

  IF major_quota IS NULL THEN
    RAISE EXCEPTION 'Jurusan hasil tidak aktif atau tidak ditemukan';
  END IF;

  SELECT count(*) INTO occupied
  FROM public.registrations
  WHERE accepted_major_id = NEW.accepted_major_id
    AND status IN ('accepted'::public.reg_status, 'enrolled'::public.reg_status)
    AND id IS DISTINCT FROM NEW.id;

  IF occupied >= major_quota THEN
    RAISE EXCEPTION 'Kuota jurusan sudah penuh';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_registration_placement() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_validate_registration_placement
BEFORE INSERT OR UPDATE OF status, accepted_major_id ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.validate_registration_placement();

CREATE OR REPLACE FUNCTION public.run_selection()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affected integer := 0;
  rec record;
  used jsonb := '{}'::jsonb;
  cnt integer;
  q integer;
  cand uuid;
  placed uuid;
  rnk integer := 0;
  m record;
  nilai_ujian numeric;
  nilai_ijazah numeric;
  layak boolean;
  existing record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('public.run_selection'));

  UPDATE public.registrations r SET total_score = sub.score
  FROM (
    SELECT rs.registration_id,
           ROUND(SUM((rs.value / NULLIF(c.max_value, 0)) * c.weight)::numeric, 3) AS score
    FROM public.registration_scores rs
    JOIN public.criteria c ON c.id = rs.criteria_id AND c.active
    GROUP BY rs.registration_id
  ) sub
  WHERE r.id = sub.registration_id
    AND r.status IN ('verified', 'accepted', 'not_accepted');

  UPDATE public.registrations
  SET total_score = 0
  WHERE total_score IS NULL
    AND status IN ('verified', 'accepted', 'not_accepted');

  UPDATE public.registrations
  SET status = 'verified', accepted_major_id = NULL, rank = NULL
  WHERE status IN ('accepted', 'not_accepted');

  FOR existing IN
    SELECT accepted_major_id, count(*)::integer AS total
    FROM public.registrations
    WHERE status = 'enrolled' AND accepted_major_id IS NOT NULL
    GROUP BY accepted_major_id
  LOOP
    used := jsonb_set(used, ARRAY[existing.accepted_major_id::text], to_jsonb(existing.total), true);
  END LOOP;

  FOR rec IN
    SELECT r.id, r.first_choice_id, r.second_choice_id
    FROM public.registrations r
    WHERE r.status = 'verified'
    ORDER BY r.total_score DESC NULLS LAST, r.submitted_at ASC, r.id ASC
  LOOP
    rnk := rnk + 1;
    placed := NULL;

    FOREACH cand IN ARRAY ARRAY[rec.first_choice_id, rec.second_choice_id]
    LOOP
      IF cand IS NOT NULL AND placed IS NULL THEN
        SELECT id, quota, min_exam_score, min_diploma_score, exam_criteria_id, diploma_criteria_id
        INTO m
        FROM public.majors
        WHERE id = cand AND active;

        IF m.id IS NOT NULL THEN
          layak := true;

          IF COALESCE(m.min_exam_score, 0) > 0 AND m.exam_criteria_id IS NOT NULL THEN
            SELECT value INTO nilai_ujian
            FROM public.registration_scores
            WHERE registration_id = rec.id AND criteria_id = m.exam_criteria_id;
            IF COALESCE(nilai_ujian, 0) < m.min_exam_score THEN
              layak := false;
            END IF;
          END IF;

          IF layak AND COALESCE(m.min_diploma_score, 0) > 0 AND m.diploma_criteria_id IS NOT NULL THEN
            SELECT value INTO nilai_ijazah
            FROM public.registration_scores
            WHERE registration_id = rec.id AND criteria_id = m.diploma_criteria_id;
            IF COALESCE(nilai_ijazah, 0) < m.min_diploma_score THEN
              layak := false;
            END IF;
          END IF;

          q := m.quota;
          cnt := COALESCE((used ->> cand::text)::integer, 0);
          IF layak AND cnt < q THEN
            used := jsonb_set(used, ARRAY[cand::text], to_jsonb(cnt + 1), true);
            placed := cand;
          END IF;
        END IF;
      END IF;
    END LOOP;

    IF placed IS NOT NULL THEN
      UPDATE public.registrations
      SET status = 'accepted', accepted_major_id = placed, rank = rnk
      WHERE id = rec.id;
      affected := affected + 1;
    ELSE
      UPDATE public.registrations
      SET status = 'not_accepted', accepted_major_id = NULL, rank = rnk
      WHERE id = rec.id;
    END IF;
  END LOOP;

  INSERT INTO public.audit_logs (actor_id, action, entity, detail)
  VALUES (auth.uid(), 'jalankan_seleksi', 'registrations', jsonb_build_object('diterima', affected));

  RETURN affected;
END;
$function$;

REVOKE ALL ON FUNCTION public.run_selection() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_selection() TO authenticated;