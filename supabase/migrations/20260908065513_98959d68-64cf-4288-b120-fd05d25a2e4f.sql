ALTER TABLE public.majors
  ADD COLUMN IF NOT EXISTS min_exam_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_diploma_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exam_criteria_id uuid REFERENCES public.criteria(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS diploma_criteria_id uuid REFERENCES public.criteria(id) ON DELETE SET NULL;

UPDATE public.majors SET exam_criteria_id = (SELECT id FROM public.criteria WHERE code = 'WAWANCARA' LIMIT 1) WHERE exam_criteria_id IS NULL;
UPDATE public.majors SET diploma_criteria_id = (SELECT id FROM public.criteria WHERE code = 'RAPOR' LIMIT 1) WHERE diploma_criteria_id IS NULL;