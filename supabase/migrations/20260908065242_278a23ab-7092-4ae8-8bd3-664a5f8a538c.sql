CREATE TYPE public.app_role AS ENUM ('admin','operator','wali');
CREATE TYPE public.reg_status AS ENUM ('draft','submitted','verified','rejected','accepted','not_accepted','enrolled');
CREATE TYPE public.doc_status AS ENUM ('pending','approved','rejected');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','operator'));
$$;

CREATE POLICY "profil sendiri dibaca" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "profil sendiri dibuat" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profil sendiri diubah" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "peran dibaca sendiri" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'wali') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.majors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  quota integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.majors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.majors TO authenticated;
GRANT ALL ON public.majors TO service_role;
ALTER TABLE public.majors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jurusan publik" ON public.majors FOR SELECT USING (true);
CREATE POLICY "jurusan dikelola operator" ON public.majors FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_majors_updated BEFORE UPDATE ON public.majors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  weight numeric(5,2) NOT NULL DEFAULT 0,
  max_value numeric(6,2) NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.criteria TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.criteria TO authenticated;
GRANT ALL ON public.criteria TO service_role;
ALTER TABLE public.criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kriteria publik" ON public.criteria FOR SELECT USING (true);
CREATE POLICY "kriteria dikelola operator" ON public.criteria FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_criteria_updated BEFORE UPDATE ON public.criteria FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.settings (
  id boolean PRIMARY KEY DEFAULT true,
  school_name text NOT NULL DEFAULT 'SMK Mutu',
  academic_year text NOT NULL DEFAULT '2026/2027',
  contact_phone text,
  contact_email text,
  address text,
  registration_open_at timestamptz,
  registration_close_at timestamptz,
  announcement_at timestamptz,
  reregistration_close_at timestamptz,
  announcement_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_singleton CHECK (id)
);
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jadwal publik" ON public.settings FOR SELECT USING (true);
CREATE POLICY "jadwal diubah operator" ON public.settings FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.settings (id, school_name, academic_year, registration_open_at, registration_close_at, announcement_at, reregistration_close_at)
VALUES (true, 'SMK Mutu', '2026/2027', now() - interval '1 day', now() + interval '30 days', now() + interval '31 days', now() + interval '45 days');

INSERT INTO public.majors (code, name, description, quota, active) VALUES
 ('TKJ','Teknik Komputer dan Jaringan','Jaringan komputer, server, dan keamanan siber.',72,true),
 ('RPL','Rekayasa Perangkat Lunak','Pemrograman web, mobile, dan basis data.',72,true),
 ('AKL','Akuntansi dan Keuangan Lembaga','Akuntansi, perpajakan, dan administrasi keuangan.',36,true),
 ('OTKP','Otomatisasi dan Tata Kelola Perkantoran','Administrasi perkantoran dan kearsipan digital.',36,true);

INSERT INTO public.criteria (code, name, weight, max_value, sort_order) VALUES
 ('RAPOR','Rata-rata Nilai Rapor', 50, 100, 1),
 ('PRESTASI','Poin Prestasi/Sertifikat', 25, 100, 2),
 ('JARAK','Skor Jarak Tempat Tinggal', 15, 100, 3),
 ('WAWANCARA','Nilai Wawancara/Tes', 10, 100, 4);

CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  registration_number text UNIQUE,
  qr_token text NOT NULL DEFAULT encode(gen_random_bytes(12),'hex'),
  full_name text,
  nisn text,
  nik text,
  gender text,
  birth_place text,
  birth_date date,
  address text,
  village text,
  district text,
  city text,
  province text,
  postal_code text,
  previous_school text,
  graduation_year text,
  parent_name text,
  parent_phone text,
  parent_job text,
  parent_email text,
  first_choice_id uuid REFERENCES public.majors(id),
  second_choice_id uuid REFERENCES public.majors(id),
  status public.reg_status NOT NULL DEFAULT 'draft',
  total_score numeric(8,3),
  rank integer,
  accepted_major_id uuid REFERENCES public.majors(id),
  verify_note text,
  submitted_at timestamptz,
  verified_at timestamptz,
  enrolled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pendaftaran dibaca pemilik" ON public.registrations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "pendaftaran dibuat pemilik" ON public.registrations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "pendaftaran diubah pemilik draft" ON public.registrations FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'draft') WITH CHECK (user_id = auth.uid());
CREATE POLICY "pendaftaran dikelola operator" ON public.registrations FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_reg_updated BEFORE UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE public.registration_seq START 1;
CREATE OR REPLACE FUNCTION public.assign_registration_number() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE yr text;
BEGIN
  IF NEW.status <> 'draft' AND NEW.registration_number IS NULL THEN
    yr := to_char(timezone('Asia/Jakarta', now()), 'YYYY');
    NEW.registration_number := yr || '-' || lpad(nextval('public.registration_seq')::text, 4, '0');
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_reg_number BEFORE INSERT OR UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.assign_registration_number();

CREATE TABLE public.registration_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  criteria_id uuid NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  value numeric(6,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, criteria_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_scores TO authenticated;
GRANT ALL ON public.registration_scores TO service_role;
ALTER TABLE public.registration_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nilai dibaca pemilik" ON public.registration_scores FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.registrations r WHERE r.id = registration_id AND r.user_id = auth.uid()));
CREATE POLICY "nilai dikelola operator" ON public.registration_scores FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_scores_updated BEFORE UPDATE ON public.registration_scores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  doc_type text NOT NULL,
  file_path text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  status public.doc_status NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, doc_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dokumen dibaca pemilik" ON public.documents FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "dokumen ditambah pemilik" ON public.documents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "dokumen diubah pemilik" ON public.documents FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "dokumen dihapus pemilik" ON public.documents FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "dokumen dikelola operator" ON public.documents FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_docs_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit dibaca operator" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "audit ditulis pengguna" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

CREATE VIEW public.public_results
WITH (security_invoker = false) AS
SELECT r.registration_number,
       regexp_replace(COALESCE(r.full_name,''), '(?<=\S)\S(?=\S*(\s|$))', '*', 'g') AS masked_name,
       m.code AS major_code, m.name AS major_name,
       r.rank, r.total_score,
       r.status
FROM public.registrations r
LEFT JOIN public.majors m ON m.id = r.accepted_major_id
CROSS JOIN public.settings s
WHERE s.announcement_published = true
  AND s.announcement_at IS NOT NULL AND now() >= s.announcement_at
  AND r.status IN ('accepted','not_accepted','enrolled')
  AND r.registration_number IS NOT NULL;
GRANT SELECT ON public.public_results TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.run_selection() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected integer := 0; rec record; used jsonb := '{}'::jsonb; cnt integer; q integer; cand uuid; placed uuid; rnk integer := 0;
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
        SELECT quota INTO q FROM public.majors WHERE id = cand AND active;
        cnt := COALESCE((used->>cand::text)::int, 0);
        IF q IS NOT NULL AND cnt < q THEN
          used := jsonb_set(used, ARRAY[cand::text], to_jsonb(cnt + 1), true);
          placed := cand;
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
GRANT EXECUTE ON FUNCTION public.run_selection() TO authenticated;

CREATE POLICY "dokumen baca sendiri" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dokumen' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));
CREATE POLICY "dokumen unggah sendiri" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dokumen' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "dokumen ubah sendiri" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dokumen' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "dokumen hapus sendiri" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dokumen' AND (storage.foldername(name))[1] = auth.uid()::text);