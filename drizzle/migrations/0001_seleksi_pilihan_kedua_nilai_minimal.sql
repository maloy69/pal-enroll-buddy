CREATE OR REPLACE FUNCTION public.run_selection()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE affected integer := 0; rec record; used jsonb := '{}'::jsonb; cnt integer; q integer; cand uuid; placed uuid; rnk integer := 0;
  m record; nilai_ujian numeric; nilai_ijazah numeric; layak boolean;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Akses ditolak'; END IF;

  UPDATE public.registrations r SET total_score = sub.score
  FROM (
    SELECT rs.registration_id,
           ROUND(SUM((rs.value / NULLIF(c.max_value,0)) * c.weight)::numeric, 3) AS score
    FROM public.registration_scores rs JOIN public.criteria c ON c.id = rs.criteria_id AND c.active
    GROUP BY rs.registration_id
  ) sub
  WHERE r.id = sub.registration_id AND r.status IN ('verified','accepted','not_accepted');

  UPDATE public.registrations SET total_score = 0 WHERE total_score IS NULL AND status IN ('verified','accepted','not_accepted');

  FOR rec IN
    SELECT r.id, r.first_choice_id, r.second_choice_id
    FROM public.registrations r WHERE r.status IN ('verified','accepted','not_accepted')
    ORDER BY r.total_score DESC NULLS LAST, r.submitted_at ASC
  LOOP
    rnk := rnk + 1; placed := NULL;
    FOREACH cand IN ARRAY ARRAY[rec.first_choice_id, rec.second_choice_id] LOOP
      IF cand IS NOT NULL AND placed IS NULL THEN
        SELECT id, quota, min_exam_score, min_diploma_score, exam_criteria_id, diploma_criteria_id
          INTO m FROM public.majors WHERE id = cand AND active;
        IF m.id IS NOT NULL THEN
          layak := true;

          IF COALESCE(m.min_exam_score,0) > 0 AND m.exam_criteria_id IS NOT NULL THEN
            SELECT value INTO nilai_ujian FROM public.registration_scores
             WHERE registration_id = rec.id AND criteria_id = m.exam_criteria_id;
            IF COALESCE(nilai_ujian, 0) < m.min_exam_score THEN layak := false; END IF;
          END IF;

          IF layak AND COALESCE(m.min_diploma_score,0) > 0 AND m.diploma_criteria_id IS NOT NULL THEN
            SELECT value INTO nilai_ijazah FROM public.registration_scores
             WHERE registration_id = rec.id AND criteria_id = m.diploma_criteria_id;
            IF COALESCE(nilai_ijazah, 0) < m.min_diploma_score THEN layak := false; END IF;
          END IF;

          q := m.quota;
          cnt := COALESCE((used->>cand::text)::int, 0);
          IF layak AND q IS NOT NULL AND cnt < q THEN
            used := jsonb_set(used, ARRAY[cand::text], to_jsonb(cnt + 1), true);
            placed := cand;
          END IF;
        END IF;
      END IF;
    END LOOP;
    IF placed IS NOT NULL THEN
      UPDATE public.registrations SET status = 'accepted', accepted_major_id = placed, rank = rnk WHERE id = rec.id;
      affected := affected + 1;
    ELSE
      UPDATE public.registrations SET status = 'not_accepted', accepted_major_id = NULL, rank = rnk WHERE id = rec.id;
    END IF;
  END LOOP;

  INSERT INTO public.audit_logs (actor_id, action, entity, detail)
  VALUES (auth.uid(), 'jalankan_seleksi', 'registrations', jsonb_build_object('diterima', affected));
  RETURN affected;
END; $$;

REVOKE ALL ON FUNCTION public.run_selection() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_selection() TO authenticated;
