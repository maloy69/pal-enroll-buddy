INSERT INTO public.user_roles (user_id, role)
SELECT 'b761fe38-0c15-41f9-b598-fe1901450a45'::uuid, r
FROM (VALUES ('admin'::app_role), ('operator'::app_role)) AS t(r)
ON CONFLICT DO NOTHING;

UPDATE public.profiles
SET full_name = COALESCE(full_name, 'Operator Sekolah')
WHERE id = 'b761fe38-0c15-41f9-b598-fe1901450a45'::uuid;